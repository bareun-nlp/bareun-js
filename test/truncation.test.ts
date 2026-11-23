import { describe, expect, it, vi } from "vitest";
import { create } from "@bufbuild/protobuf";

import { Corrector } from "../src/corrector.js";
import { TruncationSchema } from "../src/gen/bareun/lang_common_pb.js";
import { AnalyzeSyntaxResponseSchema } from "../src/gen/bareun/language_service_pb.js";
import { CorrectErrorResponseSchema } from "../src/gen/bareun/revision_service_pb.js";
import { Tagged } from "../src/tagger.js";
import { toTruncationInfo } from "../src/truncation.js";
import type { BareunClient } from "../src/client.js";

const text = "가".repeat(10) + "나".repeat(5);

const truncation = create(TruncationSchema, {
  originalChars: 15,
  processedChars: 10,
  droppedChars: 5,
  droppedBeginOffset: 10,
  message: "앞 10자만 처리했습니다. (only 10 of 15)",
  cutMidWord: true,
});

describe("toTruncationInfo", () => {
  it("없으면 undefined", () => {
    expect(toTruncationInfo(undefined)).toBeUndefined();
    expect(toTruncationInfo(undefined, 3)).toBeUndefined();
  });

  it("필드를 그대로 옮기고, 문장 번호가 없으면 키도 없다", () => {
    const info = toTruncationInfo(truncation);
    expect(info).toEqual({
      originalChars: 15,
      processedChars: 10,
      droppedChars: 5,
      droppedBeginOffset: 10,
      message: "앞 10자만 처리했습니다. (only 10 of 15)",
      cutMidWord: true,
    });
    expect("droppedBeginSentenceIndex" in (info ?? {})).toBe(false);
  });

  it("문장 번호가 0 이어도 싣는다", () => {
    expect(toTruncationInfo(truncation, 0)?.droppedBeginSentenceIndex).toBe(0);
  });
});

describe("Tagged 의 잘림", () => {
  it("잘렸으면 정보와 버린 뒷부분을 준다", () => {
    const t = new Tagged(text, create(AnalyzeSyntaxResponseSchema, { truncation }));
    expect(t.truncated).toBe(true);
    expect(t.truncation?.processedChars).toBe(10);
    expect(t.droppedText()).toBe("나".repeat(5));
  });

  it("잘리지 않았으면 비어 있다", () => {
    const t = new Tagged(text, create(AnalyzeSyntaxResponseSchema, {}));
    expect(t.truncated).toBe(false);
    expect(t.truncation).toBeUndefined();
    expect(t.droppedText()).toBe("");
  });
});

/** 교정 응답을 주는 가짜 클라이언트. */
function fakeClient(res: ReturnType<typeof create<typeof CorrectErrorResponseSchema>>) {
  const correctError = vi.fn().mockResolvedValue(res);
  return { client: { revision: { correctError } } as unknown as BareunClient, correctError };
}

describe("Corrector.correctDetailed", () => {
  it("잘렸으면 truncation 과 버린 뒷부분을 준다", async () => {
    const { client } = fakeClient(
      create(CorrectErrorResponseSchema, { revised: "가".repeat(10), truncation }),
    );
    const r = await new Corrector(client).correctDetailed(text);
    expect(r.revised).toBe("가".repeat(10));
    expect(r.truncation?.droppedChars).toBe(5);
    expect(r.droppedText).toBe("나".repeat(5));
  });

  it("잘리지 않았으면 truncation 키가 없고 뒷부분이 빈 문자열이다", async () => {
    const { client, correctError } = fakeClient(
      create(CorrectErrorResponseSchema, { revised: "고침" }),
    );
    const r = await new Corrector(client).correctDetailed("원문");
    expect(r).toEqual({ revised: "고침", droppedText: "" });
    expect("truncation" in r).toBe(false);
    expect(correctError).toHaveBeenCalledOnce();
  });
});
