import { describe, expect, it, vi } from "vitest";
import { create } from "@bufbuild/protobuf";
import { Code, ConnectError } from "@connectrpc/connect";

import type { BareunClient } from "../src/client.js";
import { Corrector } from "../src/corrector.js";
import { TruncationSchema } from "../src/gen/bareun/lang_common_pb.js";
import {
  CloseSessionResponseSchema,
  CorrectErrorResponseSchema,
  GetSessionEventsResponseSchema,
  OpenSessionResponseSchema,
  SessionEventKind,
} from "../src/gen/bareun/revision_service_pb.js";
import { sessionErrorReason } from "../src/session.js";

/** 세션 호출 네 가지를 흉내 내는 가짜 클라이언트. */
function fake() {
  const revision = {
    openSession: vi.fn().mockResolvedValue(
      create(OpenSessionResponseSchema, {
        sessionId: "sid-1",
        sessionRevision: 0n,
        idleTimeoutSeconds: 600,
        maxLifetimeSeconds: 3600,
      }),
    ),
    correctError: vi.fn().mockResolvedValue(
      create(CorrectErrorResponseSchema, { revised: "고침", sessionRevision: 2n }),
    ),
    getSessionEvents: vi.fn().mockResolvedValue(
      create(GetSessionEventsResponseSchema, {
        sessionRevision: 3n,
        events: [{ revision: 3n, kind: SessionEventKind.WORD_CONFIRMED, word: "바른" }],
      }),
    ),
    closeSession: vi.fn().mockResolvedValue(
      create(CloseSessionResponseSchema, { sessionRevision: 4n }),
    ),
  };
  return { client: { revision } as unknown as BareunClient, revision };
}

describe("CorrectionSession", () => {
  it("열 때 사전과 설정을 넘기고 세션 정보를 읽는다", async () => {
    const { client, revision } = fake();
    const s = await new Corrector(client, ["기본"]).openSession({ config: { enableSentenceCheck: true } });
    expect(revision.openSession).toHaveBeenCalledWith({
      customDictNames: ["기본"],
      config: { enableSentenceCheck: true },
    });
    expect(s.sessionId).toBe("sid-1");
    expect(s.idleTimeoutSeconds).toBe(600);
    expect(s.maxLifetimeSeconds).toBe(3600);
    expect(s.revision).toBe(0n);
  });

  it("옵션이 없으면 config 키를 보내지 않고, 사전은 옵션이 우선한다", async () => {
    const { client, revision } = fake();
    await new Corrector(client, ["기본"]).openSession({ customDictNames: ["내것"] });
    expect(revision.openSession).toHaveBeenCalledWith({ customDictNames: ["내것"] });
  });

  it("교정할 때 세션 ID 만 싣고 개정 번호를 따라간다", async () => {
    const { client, revision } = fake();
    const s = await new Corrector(client).openSession();
    expect(await s.correct("원문")).toBe("고침");
    const call = revision.correctError.mock.calls[0]?.[0];
    expect(call.sessionId).toBe("sid-1");
    expect(call.customDictNames).toBeUndefined();
    expect(call.config).toBeUndefined();
    expect(s.revision).toBe(2n);
  });

  it("응답에 개정 번호가 없으면 직전 값을 유지한다", async () => {
    const { client, revision } = fake();
    const s = await new Corrector(client).openSession();
    revision.correctError.mockResolvedValueOnce(create(CorrectErrorResponseSchema, { revised: "x" }));
    await s.raw("a");
    expect(s.revision).toBe(0n);
  });

  it("correctDetailed 는 잘림 정보와 개정 번호를 준다", async () => {
    const { client, revision } = fake();
    revision.correctError.mockResolvedValueOnce(
      create(CorrectErrorResponseSchema, {
        revised: "앞",
        sessionRevision: 5n,
        truncation: create(TruncationSchema, { originalChars: 3, processedChars: 1, droppedChars: 2, droppedBeginOffset: 1 }),
      }),
    );
    const s = await new Corrector(client).openSession();
    const r = await s.correctDetailed("앞뒤뒤");
    expect(r.droppedText).toBe("뒤뒤");
    expect(r.truncation?.droppedChars).toBe(2);
    expect(r.sessionRevision).toBe(5n);
  });

  it("사건을 가져오고 닫는다", async () => {
    const { client, revision } = fake();
    const s = await new Corrector(client).openSession();
    const ev = await s.events(1n);
    expect(revision.getSessionEvents).toHaveBeenCalledWith({ sessionId: "sid-1", sinceRevision: 1n });
    expect(ev.revision).toBe(3n);
    expect(ev.events[0]?.word).toBe("바른");
    expect(s.revision).toBe(3n);
    await s.events();
    expect(revision.getSessionEvents).toHaveBeenLastCalledWith({ sessionId: "sid-1", sinceRevision: 0n });
    expect(await s.close()).toBe(4n);
    expect(revision.closeSession).toHaveBeenCalledWith({ sessionId: "sid-1" });
  });
});

describe("sessionErrorReason", () => {
  it("메시지 머리의 이유를 읽는다", () => {
    for (const r of ["SESSION_NOT_FOUND", "SESSION_EXPIRED", "SESSION_STORE_UNAVAILABLE"]) {
      expect(sessionErrorReason(new ConnectError(`${r}: 세션 문제`, Code.NotFound))).toBe(r);
    }
  });

  it("세션 오류가 아니면 undefined", () => {
    expect(sessionErrorReason(new ConnectError("다른 문제", Code.Internal))).toBeUndefined();
    expect(sessionErrorReason(new Error("SESSION_EXPIRED"))).toBeUndefined();
    expect(sessionErrorReason("x")).toBeUndefined();
  });
});
