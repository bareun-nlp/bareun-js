import type { BareunClient } from "./client.js";
import { EncodingType } from "./gen/bareun/lang_common_pb.js";
import type { MessageInitShape } from "@bufbuild/protobuf";

import {
  RevisionCategory,
  RevisionConfigSchema,
  type CorrectErrorResponse,
} from "./gen/bareun/revision_service_pb.js";
import { CorrectionSession } from "./session.js";
import { doc } from "./tagger.js";
import { toTruncationInfo, type TruncationInfo } from "./truncation.js";

/** 교정 하나. */
export interface Change {
  /** 원문 조각 */
  origin: string;
  /** 교정된 조각 */
  revised: string;
  /** 교정 분류 이름. 예: `SPACING`, `STANDARD`, `TYPO` */
  category: string;
  /** 도움말 식별자 */
  helpId: string;
  /**
   * 원문에서의 시작 위치. UTF-16 기준이라 `String.prototype.slice` 에 그대로 넣을 수 있다.
   */
  beginOffset: number;
  /** 원문 조각의 길이 */
  length: number;
}

/** {@link Corrector.correctDetailed} 의 결과. */
export interface Corrected {
  /** 교정된 문장. 글이 잘렸으면 앞부분만의 교정 결과다. */
  revised: string;
  /** 글이 서버 기준(운영 서버 5,000자)보다 길어 앞부분만 처리됐을 때의 정보. 아니면 undefined. */
  truncation?: TruncationInfo;
  /** 처리하지 않고 버린 뒷부분의 원문. 잘리지 않았으면 빈 문자열. */
  droppedText: string;
}

/**
 * 교정 응답에서 교정문과 잘림 정보를 뽑는다.
 *
 * @param text 요청에 보낸 원문
 * @param res 서버 응답
 * @returns 교정문과 잘림 정보
 */
export function toCorrected(text: string, res: CorrectErrorResponse): Corrected {
  const truncation = toTruncationInfo(res.truncation);
  const out: Corrected = {
    revised: res.revised,
    droppedText: truncation ? text.slice(truncation.droppedBeginOffset) : "",
  };
  if (truncation) {
    out.truncation = truncation;
  }
  return out;
}

/** {@link Corrector} 호출 옵션. */
export interface CorrectOptions {
  /** 쓸 사용자 사전 이름들. 앞에 온 것이 우선한다. */
  customDictNames?: string[];
  /**
   * 교정기 옵션. 주지 않으면 서버 기본값.
   *
   * protobuf-es v2 의 메시지는 `$typeName` 을 필수로 가지므로, 사용자가 쓰기 좋은
   * 타입은 그것을 뺀 초기화 모양(`MessageInitShape`)이다.
   */
  config?: MessageInitShape<typeof RevisionConfigSchema>;
}

/**
 * 맞춤법·띄어쓰기 교정을 짧게 쓰는 진입점.
 *
 * ```ts
 * const c = new Corrector(client);
 * await c.correct("이거 안돼요. 학교에 갔읍니다.");  // "이거 안돼요. 학교에 갔습니다."
 * ```
 *
 * 교정은 맞춤법 교정(rev) 빌드의 서버에서만 동작한다. 아닌 서버에 요청하면
 * `ConnectError` 가 `Code.Unimplemented` 로 나온다.
 */
export class Corrector {
  /**
   * @param client 쓸 클라이언트
   * @param customDictNames 모든 교정에 함께 쓸 사용자 사전 이름들
   */
  constructor(
    private readonly client: BareunClient,
    private readonly customDictNames: string[] = [],
  ) {}

  /**
   * 문장을 교정하고 교정된 문장만 돌려준다.
   *
   * @param text 교정할 문장
   * @param options 교정 옵션
   * @returns 교정된 문장. 고칠 것이 없으면 원문과 같다.
   */
  async correct(text: string, options: CorrectOptions = {}): Promise<string> {
    return (await this.raw(text, options)).revised;
  }

  /**
   * 교정된 문장과 함께, 글이 길어 잘렸는지도 받는다.
   *
   * 서버는 기준(운영 5,000자)을 넘는 글을 거절하지 않고 앞 5,000자 안팎만 교정한다.
   * {@link Corrector.correct} 는 그 사실을 알려 주지 않으므로, 긴 글을 다룰 때는
   * 이 메서드로 `truncation` 을 확인하고 `droppedText` 를 따로 처리한다.
   *
   * @param text 교정할 문장
   * @param options 교정 옵션
   * @returns 교정 결과와 잘림 정보
   */
  async correctDetailed(text: string, options: CorrectOptions = {}): Promise<Corrected> {
    return toCorrected(text, await this.raw(text, options));
  }

  /**
   * 무엇이 어떻게 바뀌었는지 목록으로 받는다.
   *
   * 한 어절에 여러 교정이 겹치면 서버가 블럭을 중첩해 보낸다(`nested`).
   * 여기서는 겉의 대표 교정만 담는다 — 중첩까지 보려면 {@link Corrector.raw} 를 쓴다.
   *
   * @param text 교정할 문장
   * @param options 교정 옵션
   * @returns 교정 내역
   */
  async changes(text: string, options: CorrectOptions = {}): Promise<Change[]> {
    const res = await this.raw(text, options);
    return res.revisedBlocks.map((b) => {
      // revisions 는 후보 목록이다. 대표 교정은 block.revised 이고,
      // 분류·도움말은 그 대표가 나온 근거인 첫 후보에서 가져온다.
      const first = b.revisions[0];
      return {
        origin: b.origin?.content ?? "",
        revised: b.revised,
        category: first ? (RevisionCategory[first.category] ?? String(first.category)) : "",
        helpId: first?.helpId ?? "",
        beginOffset: b.origin?.beginOffset ?? 0,
        length: b.origin?.length ?? 0,
      };
    });
  }

  /**
   * 세션을 연다. 긴 문서를 작은 단위로 이어서 교정할 때 쓴다.
   *
   * 사용자 사전과 교정기 설정은 여기서 한 번 정해지고 세션이 닫힐 때까지 바뀌지
   * 않는다. 이후 호출은 그 설정을 쓰므로 호출마다 `config` 를 줄 수 없다.
   *
   * @param options 사전·교정기 옵션. 사전은 생성자에 준 것이 기본값이다.
   * @returns 열린 세션
   */
  async openSession(options: CorrectOptions = {}): Promise<CorrectionSession> {
    const res = await this.client.revision.openSession({
      customDictNames: options.customDictNames ?? this.customDictNames,
      ...(options.config ? { config: options.config } : {}),
    });
    return new CorrectionSession(this.client, res);
  }

  /**
   * 서버 응답을 그대로 받는다. 중첩 블럭·도움말·문장 단위 결과가 필요할 때 쓴다.
   *
   * @param text 교정할 문장
   * @param options 교정 옵션
   * @returns 서버 응답
   */
  async raw(text: string, options: CorrectOptions = {}): Promise<CorrectErrorResponse> {
    return this.client.revision.correctError({
      document: doc(text),
      // 교정 결과의 위치도 자바스크립트 문자열 기준이어야 slice 가 맞는다.
      encodingType: EncodingType.UTF16,
      customDictNames: options.customDictNames ?? this.customDictNames,
      ...(options.config ? { config: options.config } : {}),
    });
  }
}
