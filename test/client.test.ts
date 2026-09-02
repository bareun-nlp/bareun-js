import { describe, expect, it } from "vitest";

import { createBareunClient, resolveBaseUrl } from "../src/client.js";

describe("resolveBaseUrl", () => {
  it("host·port·useTls 로 주소를 만든다", () => {
    expect(resolveBaseUrl({ apiKey: "k" })).toBe("http://localhost:5656");
    expect(resolveBaseUrl({ apiKey: "k", host: "nlp.bareun.ai", port: 5658 }))
      .toBe("http://nlp.bareun.ai:5658");
    expect(resolveBaseUrl({ apiKey: "k", host: "api.bareun.ai", port: 443, useTls: true }))
      .toBe("https://api.bareun.ai:443");
  });

  it("baseUrl 이 host·port 보다 우선한다", () => {
    expect(resolveBaseUrl({ apiKey: "k", baseUrl: "https://x.example", host: "y", port: 1 }))
      .toBe("https://x.example");
  });

  it("끝 슬래시를 지운다", () => {
    // 붙어 있으면 경로가 "//bareun.LanguageService/..." 가 되어 404 가 난다.
    expect(resolveBaseUrl({ apiKey: "k", baseUrl: "https://x.example///" }))
      .toBe("https://x.example");
  });

  it("빈 baseUrl 은 무시한다", () => {
    expect(resolveBaseUrl({ apiKey: "k", baseUrl: "  " })).toBe("http://localhost:5656");
  });
});

describe("createBareunClient", () => {
  it("API 키가 없으면 만들 때 막는다", () => {
    // 키 없이 만들면 첫 호출에서 permission_denied 로 떨어지는데, 그때는
    // 설정 누락인지 키 오류인지 구분되지 않는다.
    expect(() => createBareunClient({ apiKey: "" })).toThrow(TypeError);
    expect(() => createBareunClient({ apiKey: "   " })).toThrow(TypeError);
  });

  it("서비스별 클라이언트를 모두 만든다", () => {
    const c = createBareunClient({ apiKey: "koba-TEST" });
    expect(c.language.analyzeSyntax).toBeTypeOf("function");
    expect(c.revision.correctError).toBeTypeOf("function");
    expect(c.dictSearch.searchDict).toBeTypeOf("function");
    expect(c.customDictionary.getCustomDictionaryList).toBeTypeOf("function");
    expect(c.transport).toBeDefined();
  });

  it("모든 요청에 api-key 헤더를 싣는다", async () => {
    let seen: string | null = null;
    const fakeFetch: typeof globalThis.fetch = async (_input, init) => {
      seen = new Headers(init?.headers).get("api-key");
      // 이 테스트가 보는 것은 헤더뿐이다. 응답은 아무거나 돌려주고
      // 호출 쪽 오류는 잡아 버린다.
      return new Response(new Uint8Array(), { status: 500 });
    };
    const c = createBareunClient({ apiKey: "koba-HEADER", fetch: fakeFetch });
    await c.language.analyzeSyntax({ document: { content: "가", language: "ko_KR" } })
      .catch(() => undefined);
    expect(seen).toBe("koba-HEADER");
  });
});
