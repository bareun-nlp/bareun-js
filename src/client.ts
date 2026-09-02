import { createClient, type Client, type Transport } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

import { LanguageService } from "./gen/bareun/language_service_pb.js";
import { RevisionService } from "./gen/bareun/revision_service_pb.js";
import { DictSearchService } from "./gen/bareun/dict_search_service_pb.js";
import { CustomDictionaryService } from "./gen/bareun/custom_dict_pb.js";

/** {@link createBareunClient} 옵션. */
export interface BareunClientOptions {
  /** API 키. bareun.ai 에서 발급받는다. 필수. */
  apiKey: string;
  /**
   * 서버 기준 주소. 예: `http://localhost:5656`, `https://api.bareun.ai`.
   *
   * 주지 않으면 `host`·`port`·`useTls` 로 만든다.
   */
  baseUrl?: string;
  /** 서버 호스트. 기본 `localhost`. URL 이 아니라 이름이나 IP 만 준다. */
  host?: string;
  /** 서버 포트. 기본 5656. 네이티브 설치본은 5658 이 관례다. */
  port?: number;
  /** TLS 사용 여부. 기본 false. 공개 서비스(api.bareun.ai:443)에 붙을 때 켠다. */
  useTls?: boolean;
  /**
   * 쓸 fetch 구현. 기본은 전역 fetch.
   *
   * Node 18 미만이나, 프록시·타임아웃을 감싼 fetch 를 쓰고 싶을 때 넘긴다.
   */
  fetch?: typeof globalThis.fetch;
  /**
   * 전송 계층을 직접 준다. 주면 위의 주소·fetch 설정은 무시된다.
   *
   * Node 에서 HTTP/2 를 쓰고 싶으면 `@connectrpc/connect-node` 의
   * `createConnectTransport` 를 만들어 넘긴다.
   */
  transport?: Transport;
}

/**
 * 바른 서버의 서비스별 클라이언트 묶음.
 *
 * 각 클라이언트의 메서드 이름은 proto 의 메서드를 camelCase 로 옮긴 것이다
 * (`AnalyzeSyntax` → `analyzeSyntax`).
 */
export interface BareunClient {
  /** 형태소 분석 */
  language: Client<typeof LanguageService>;
  /** 맞춤법 교정. 교정(rev) 빌드의 서버에서만 동작한다. */
  revision: Client<typeof RevisionService>;
  /** 우리말샘 사전 자소 검색. 교정(rev) 빌드의 서버에서만 동작한다. */
  dictSearch: Client<typeof DictSearchService>;
  /** 사용자 사전 */
  customDictionary: Client<typeof CustomDictionaryService>;
  /** 밑에 깔린 전송 계층. 이 라이브러리가 감싸지 않은 서비스를 부를 때 쓴다. */
  transport: Transport;
}

/**
 * 바른 서버에 붙는 클라이언트를 만든다.
 *
 * 브라우저와 Node 18+ 에서 모두 동작한다. 전송은 fetch 기반 Connect 이고,
 * 서버가 CORS 를 직접 처리하므로 브라우저에서 프록시 없이 부를 수 있다.
 *
 * ```ts
 * const client = createBareunClient({ apiKey: "koba-...", host: "localhost", port: 5656 });
 * const res = await client.language.analyzeSyntax({
 *   document: { content: "아버지가 방에 들어가신다.", language: "ko_KR" },
 * });
 * ```
 *
 * @param options 접속 설정
 * @returns 서비스별 클라이언트
 * @throws {TypeError} apiKey 가 비어 있으면. 키 없이 만들면 첫 호출에서
 *   permission_denied 로 떨어지는데, 그때는 설정 누락인지 키 오류인지 구분되지 않는다.
 */
export function createBareunClient(options: BareunClientOptions): BareunClient {
  const { apiKey } = options;
  if (!apiKey || apiKey.trim() === "") {
    throw new TypeError("apiKey 는 비어 있을 수 없습니다.");
  }

  const transport = options.transport ?? createConnectTransport({
    baseUrl: resolveBaseUrl(options),
    // API 키를 매 호출의 헤더로 싣는다. 인터셉터로 두면 사용자가 요청마다
    // 헤더를 챙기지 않아도 되고, 저수준 클라이언트를 써도 빠지지 않는다.
    interceptors: [
      (next) => async (req) => {
        req.header.set("api-key", apiKey);
        return next(req);
      },
    ],
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  return {
    language: createClient(LanguageService, transport),
    revision: createClient(RevisionService, transport),
    dictSearch: createClient(DictSearchService, transport),
    customDictionary: createClient(CustomDictionaryService, transport),
    transport,
  };
}

/**
 * 옵션에서 기준 주소를 정한다.
 *
 * `baseUrl` 이 있으면 그것을 쓰고, 없으면 host·port·useTls 로 만든다.
 * 끝 슬래시는 지운다 — 붙어 있으면 경로가 `//bareun.LanguageService/...` 가 되어 404 가 난다.
 *
 * @param options 접속 설정
 * @returns 기준 주소
 */
export function resolveBaseUrl(options: BareunClientOptions): string {
  if (options.baseUrl && options.baseUrl.trim() !== "") {
    return options.baseUrl.replace(/\/+$/, "");
  }
  const scheme = options.useTls ? "https" : "http";
  const host = options.host ?? "localhost";
  const port = options.port ?? 5656;
  return `${scheme}://${host}:${port}`;
}
