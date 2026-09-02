/**
 * 바른(bareun) 한국어 형태소 분석·맞춤법 교정 서버의 TypeScript 클라이언트.
 *
 * ```ts
 * import { createBareunClient, Tagger, Corrector } from "bareun";
 *
 * const client = createBareunClient({ apiKey: "koba-...", host: "localhost", port: 5656 });
 * const t = await new Tagger(client).tag("아버지가 방에 들어가신다.");
 * t.nouns();  // ["아버지", "방"]
 * ```
 */

export { createBareunClient, resolveBaseUrl } from "./client.js";
export type { BareunClient, BareunClientOptions } from "./client.js";

export { Tagger, Tagged, tagName, doc, JS_ENCODING } from "./tagger.js";
export type { SenseEntry, TagOptions } from "./tagger.js";

export { Corrector } from "./corrector.js";
export type { Change, CorrectOptions } from "./corrector.js";

export { Code, ConnectError, isBareunError, describeError } from "./errors.js";

// 생성된 proto 타입을 그대로 내보낸다. 요청을 직접 만들거나 응답을 깊이
// 들여다볼 때 필요하다.
export * from "./gen/bareun/lang_common_pb.js";
export * from "./gen/bareun/language_service_pb.js";
export * from "./gen/bareun/revision_service_pb.js";
export * from "./gen/bareun/dict_search_service_pb.js";
export * from "./gen/bareun/custom_dict_pb.js";
export * from "./gen/bareun/dict_common_pb.js";
