import { ConnectError } from "@connectrpc/connect";

import type { BareunClient } from "./client.js";
import { EncodingType } from "./gen/bareun/lang_common_pb.js";
import type {
  CorrectErrorResponse,
  OpenSessionResponse,
  SessionEvent,
} from "./gen/bareun/revision_service_pb.js";
import { doc } from "./tagger.js";
import { toCorrected, type Corrected } from "./corrector.js";

/** 세션 오류의 이유. 서버가 ErrorInfo(domain `bareun.ai/session`)와 메시지 머리에 적는다. */
export type SessionErrorReason =
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "SESSION_STORE_UNAVAILABLE";

const REASONS: SessionErrorReason[] = [
  "SESSION_NOT_FOUND",
  "SESSION_EXPIRED",
  "SESSION_STORE_UNAVAILABLE",
];

/**
 * 오류가 세션 문제였는지, 그렇다면 이유가 무엇인지 알려 준다.
 *
 * 대응은 이유마다 다르다.
 * - `SESSION_NOT_FOUND`·`SESSION_EXPIRED`: 세션을 새로 열고, 필요한 앞부분을 다시 보낸다.
 * - `SESSION_STORE_UNAVAILABLE`: 세션을 다시 열지 말고 잠시 뒤 다시 한다.
 *   급하면 세션 없이 `Corrector.correct` 로 보낸다(세션 없는 교정은 이 장애와 무관하다).
 *
 * @param e 잡은 오류
 * @returns 세션 오류의 이유. 세션 오류가 아니면 undefined
 */
export function sessionErrorReason(e: unknown): SessionErrorReason | undefined {
  if (!(e instanceof ConnectError)) {
    return undefined;
  }
  return REASONS.find((r) => e.rawMessage.includes(r));
}

/** {@link CorrectionSession.correctDetailed} 의 결과. */
export interface SessionCorrected extends Corrected {
  /** 이 응답을 만든 시점의 세션 개정 번호 */
  sessionRevision: bigint;
}

/** 세션 사건 조회 결과. */
export interface SessionEvents {
  /** 지금의 세션 개정 번호 */
  revision: bigint;
  /** 요청한 개정 번호보다 큰 사건들. 개정 번호 순. */
  events: SessionEvent[];
}

/**
 * 열려 있는 교정 세션.
 *
 * 세션은 미등록 단어가 두 번 이상 나와야 알려진 말로 확정하며, 그 상태를 호출 사이에
 * 이어 간다. 그래서 긴 문서를 단락 단위로 나눠 같은 세션에 순서대로 보내면, 앞에서
 * 본 단어가 뒤의 교정에 반영된다. {@link Corrector.openSession} 으로 얻는다.
 *
 * ```ts
 * const s = await new Corrector(client).openSession();
 * try {
 *   for (const para of paragraphs) out.push(await s.correct(para));
 * } finally {
 *   await s.close();
 * }
 * ```
 */
export class CorrectionSession {
  /** 세션 ID */
  readonly sessionId: string;
  /** 마지막 호출 뒤 이 시간(초)이 지나면 세션이 닫힌다. 호출할 때마다 다시 센다. */
  readonly idleTimeoutSeconds: number;
  /** 열린 지 이 시간(초)이 지나면 호출이 이어져도 세션이 닫힌다. */
  readonly maxLifetimeSeconds: number;
  /** 가장 최근에 본 세션 개정 번호 */
  revision: bigint;

  /**
   * @param client 쓸 클라이언트
   * @param opened OpenSession 응답
   */
  constructor(
    private readonly client: BareunClient,
    opened: OpenSessionResponse,
  ) {
    this.sessionId = opened.sessionId;
    this.idleTimeoutSeconds = opened.idleTimeoutSeconds;
    this.maxLifetimeSeconds = opened.maxLifetimeSeconds;
    this.revision = opened.sessionRevision;
  }

  /**
   * 세션으로 교정하고 교정문만 돌려준다.
   *
   * @param text 교정할 글
   * @returns 교정된 글
   */
  async correct(text: string): Promise<string> {
    return (await this.raw(text)).revised;
  }

  /**
   * 교정문과 함께 잘림 정보·세션 개정 번호를 받는다.
   *
   * @param text 교정할 글
   * @returns 교정 결과
   */
  async correctDetailed(text: string): Promise<SessionCorrected> {
    const res = await this.raw(text);
    return { ...toCorrected(text, res), sessionRevision: this.revision };
  }

  /**
   * 서버 응답을 그대로 받는다. 사전·설정은 세션을 열 때 정한 것이 쓰인다.
   *
   * @param text 교정할 글
   * @returns 서버 응답
   */
  async raw(text: string): Promise<CorrectErrorResponse> {
    const res = await this.client.revision.correctError({
      document: doc(text),
      encodingType: EncodingType.UTF16,
      sessionId: this.sessionId,
    });
    if (res.sessionRevision !== undefined) {
      this.revision = res.sessionRevision;
    }
    return res;
  }

  /**
   * 세션의 변경 사건을 가져온다.
   *
   * 앞 호출의 답을 받은 뒤 세션이 새 단어를 확정해 그 답이 달라졌을 수 있는지
   * 알아볼 때 쓴다. 개정 번호가 올랐다면 사건 목록으로 어떤 단어 때문인지 안다.
   *
   * @param sinceRevision 이 번호보다 큰 사건만 받는다. 기본 0(처음부터)
   * @returns 지금의 개정 번호와 사건들
   */
  async events(sinceRevision: bigint = 0n): Promise<SessionEvents> {
    const res = await this.client.revision.getSessionEvents({
      sessionId: this.sessionId,
      sinceRevision,
    });
    this.revision = res.sessionRevision;
    return { revision: res.sessionRevision, events: res.events };
  }

  /**
   * 세션을 닫는다. 호출하지 않아도 유휴 시간이 지나면 닫히지만, 닫으면 서버의
   * 동시 세션 수 상한을 바로 돌려받는다.
   *
   * @returns 닫힌 시점의 세션 개정 번호
   */
  async close(): Promise<bigint> {
    const res = await this.client.revision.closeSession({ sessionId: this.sessionId });
    this.revision = res.sessionRevision;
    return res.sessionRevision;
  }
}
