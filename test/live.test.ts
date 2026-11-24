import { beforeAll, describe, expect, it } from "vitest";

import { createBareunClient, type BareunClient } from "../src/client.js";
import { Corrector } from "../src/corrector.js";
import { DictSearchAnchor } from "../src/gen/bareun/dict_search_service_pb.js";
import { sessionErrorReason } from "../src/session.js";
import { Tagger } from "../src/tagger.js";

/**
 * 살아 있는 서버가 있어야 도는 통합 테스트.
 *
 * BAREUN_API_KEY 가 없으면 통째로 건너뛴다. 서버가 없다는 이유로 CI 가 빨개지면
 * 아무도 보지 않게 된다.
 *
 * 주소는 BAREUN_HOST(기본 localhost)·BAREUN_PORT(기본 5656)로 준다.
 * 교정과 사전 검색은 맞춤법 교정(rev) 빌드에서만 동작한다.
 */
const apiKey = process.env["BAREUN_API_KEY"];

describe.skipIf(!apiKey)("살아 있는 서버", () => {
  // skipIf 로 건너뛰는 스위트도 본문은 테스트 수집을 위해 실행된다. 그래서
  // 클라이언트를 여기서 바로 만들면 키가 없는 환경(CI)에서 수집 단계가 죽는다.
  // beforeAll 은 실제로 도는 스위트에서만 불리므로 거기서 만든다.
  let client: BareunClient;

  beforeAll(() => {
    client = createBareunClient({
      apiKey: apiKey ?? "",
      host: process.env["BAREUN_HOST"] ?? "localhost",
      port: Number(process.env["BAREUN_PORT"] ?? 5656),
    });
  });

  it("형태소 분석", async () => {
    const t = await new Tagger(client).tag("아버지가 방에 들어가신다.");
    expect(t.nouns()).toEqual(["아버지", "방"]);
    expect(t.verbs()).toEqual(["들어가"]);
    expect(t.pos()).toContain("아버지/NNG");
  });

  it("오프셋이 자바스크립트 문자열 기준이다", async () => {
    // UTF16 으로 요청하므로 서버가 준 위치를 slice 에 그대로 넣을 수 있어야 한다.
    const text = "아버지가 방에 들어가신다.";
    const span = (await new Tagger(client).tag(text)).response.sentences[0]!.tokens[0]!.text!;
    expect(text.slice(span.beginOffset, span.beginOffset + span.length)).toBe("아버지가");
  });

  it("동형이의어 의미 구분", async () => {
    const senses = (await new Tagger(client).tag("나는 밤에 밤을 먹었다.", { withSense: true }))
      .senses();
    expect(senses.length).toBeGreaterThan(0);
    expect(senses.some((s) => s.meaning !== "")).toBe(true);
  });

  it("맞춤법 교정", async () => {
    const c = new Corrector(client);
    expect(await c.correct("이거 안돼요. 학교에 갔읍니다.")).toBe("이거 안돼요. 학교에 갔습니다.");

    const changes = await c.changes("이거 안돼요. 학교에 갔읍니다.");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      origin: "갔읍니다.",
      revised: "갔습니다.",
      category: "STANDARD",
    });
  });

  it("사전 자소 검색", async () => {
    const res = await client.dictSearch.searchDict({
      pattern: "{ㅅ//ㄴ}다",
      anchor: DictSearchAnchor.WORD,
      pos: ["동사"],
      limit: 10,
    });
    expect(res.entries.map((e) => e.word)).toEqual(["신다"]);

    const suffix = await client.dictSearch.searchDict({
      pattern: "아지",
      anchor: DictSearchAnchor.SUFFIX,
      limit: 10,
    });
    expect(suffix.entries.map((e) => e.word)).toContain("강아지");
  });

  it("사용자 사전 목록", async () => {
    // 사전이 하나도 없어도 호출 자체는 성공해야 한다.
    await client.customDictionary.getCustomDictionaryList({});
  });

  it("어절 분절", async () => {
    const res = await client.language.tokenize({
      document: { content: "아버지가 방에 들어가신다.", language: "ko_KR" },
    });
    expect(res.sentences.length).toBeGreaterThan(0);
  });
  // 잘림은 서버가 기준을 켜 둔 때만 일어난다.
  // 기준이 꺼진 서버에서는 기준 넘는 글을 다 처리해 오래 걸리므로 켜 둔 환경에서만 돈다.
  it.skipIf(!process.env["BAREUN_EXPECT_TRUNCATION"])("기준을 넘는 9,001자 요청은 앞부분만 처리하고 알린다", async () => {
    const text = "오늘은 날씨가 맑아서 공원에 산책을 다녀왔다. ".repeat(1000).slice(0, 9001);
    const t = await new Tagger(client).tag(text);
    expect(t.truncated).toBe(true);
    expect(t.truncation?.originalChars).toBe(9001);
    expect(t.droppedText()).toBe(text.slice(t.truncation?.droppedBeginOffset));

    const c = await new Corrector(client).correctDetailed(text);
    expect(c.truncation?.droppedChars).toBeGreaterThan(0);
    expect(c.droppedText.length).toBe(c.truncation?.droppedChars);

    const short = await new Tagger(client).tag("아버지가 방에 들어가신다.");
    expect(short.truncated).toBe(false);
  });
  it("세션을 열고 이어서 교정하고 닫는다", async () => {
    const s = await new Corrector(client).openSession();
    try {
      expect(s.sessionId).not.toBe("");
      expect(await s.correct("학교에 갔읍니다.")).toBe("학교에 갔습니다.");
      expect(await s.correct("이어서 갔읍니다.")).toBe("이어서 갔습니다.");
      const ev = await s.events();
      expect(ev.revision).toBe(s.revision);
    } finally {
      await s.close();
    }
    // 닫힌 세션은 서버가 모른다.
    await expect(s.correct("또 갔읍니다.")).rejects.toSatisfy(
      (e) => sessionErrorReason(e) === "SESSION_NOT_FOUND",
    );
  });
});
