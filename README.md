# bareun-js

바른(bareun) 한국어 형태소 분석·맞춤법 교정 서버의 TypeScript 클라이언트입니다.

바른에 대해서는 [bareun.ai](https://bareun.ai) 를 보세요.

## 설치

```
npm install bareun
```

Node 18 이상, 그리고 브라우저에서 동작합니다. 타입 정의가 함께 들어 있습니다.

## 서버 준비

1. [bareun.ai](https://bareun.ai) 에서 API 키를 발급받습니다.
2. 서버를 실행합니다. [설치 안내](https://docs.bareun.ai/install/overview/)

```
docker pull bareunai/bareun:latest
```

교정과 사전 검색은 맞춤법 교정(rev) 빌드의 서버에서만 동작합니다.

## 형태소 분석

```ts
import { createBareunClient, Tagger } from "bareun";

const client = createBareunClient({
  apiKey: "koba-...",
  host: "localhost",
  port: 5656,
});

const t = await new Tagger(client).tag("아버지가 방에 들어가신다.");

t.pos();     // ["아버지/NNG", "가/JKS", "방/NNG", "에/JKB", "들어가/VV", "시/EP", "ㄴ다/EF", "./SF"]
t.morphs();  // ["아버지", "가", "방", "에", "들어가", "시", "ㄴ다", "."]
t.nouns();   // ["아버지", "방"]
t.verbs();   // ["들어가"]
```

공개 서비스에 붙을 때는 주소를 통째로 줍니다.

```ts
createBareunClient({ apiKey: "koba-...", baseUrl: "https://api.bareun.ai" });
```

### 브라우저에서

서버가 CORS 를 직접 처리하므로 프록시 없이 부를 수 있습니다. 다만 API 키가 번들에
들어가므로, 공개 페이지라면 서버를 하나 두고 그쪽에서 부르세요.

### 위치 정보

요청은 UTF-16 오프셋으로 보냅니다. 자바스크립트 문자열이 UTF-16 이라, 서버가 준
위치를 `slice` 에 그대로 넣을 수 있습니다.

```ts
const span = t.response.sentences[0].tokens[0].text;
text.slice(span.beginOffset, span.beginOffset + span.length);  // "아버지가"
```

### 사용자 사전

```ts
const tagger = new Tagger(client, ["mydict"]);
```

사전은 `client.customDictionary` 로 만들고 지웁니다. 여럿을 주면 앞에 온 것이 우선합니다.

## 동형이의어 의미 구분 (WSD)

같은 글자가 여러 뜻을 가질 때 어느 뜻인지 골라 줍니다. 서버에 WSD 모델이 실려
있어야 하고, 추론이 한 번 더 돌아 느려집니다.

```ts
const t = await tagger.tag("나는 밤에 밤을 먹었다.", { withSense: true });
for (const s of t.senses()) {
  console.log(`${s.morph}/${s.tag} ${s.senseNo} ${s.meaning}`);
}
// 밤/NNG 2 밤나무의 열매. ...
// 먹/VV 2 음식 따위를 입을 통하여 뱃속에 들여보내다.
```

조사·어미처럼 의미를 갖지 않는 형태소에는 원래 붙지 않으므로, 대부분의 형태소는
결과에 나오지 않습니다.

## 맞춤법 교정

```ts
import { Corrector } from "bareun";

const c = new Corrector(client);

await c.correct("이거 안되요. 학교에 갔읍니다.");
// "이거 안되요. 학교에 갔습니다."

for (const ch of await c.changes("이거 안되요. 학교에 갔읍니다.")) {
  console.log(`${ch.origin} → ${ch.revised} (${ch.category})`);
}
// 갔읍니다. → 갔습니다. (STANDARD)
```

중첩 교정이나 도움말까지 보려면 `c.raw(text)` 로 서버 응답을 그대로 받습니다.

## 우리말샘 사전 자소 검색

완성형 한글로는 "초성이 ㅅ 이고 종성이 ㄴ 인 음절" 같은 조건을 쓸 수 없습니다.
자소 슬롯 패턴으로 찾습니다.

```ts
import { DictSearchAnchor } from "bareun";

const res = await client.dictSearch.searchDict({
  pattern: "{ㅅ//ㄴ}다",
  pos: ["동사"],
});
res.entries.map((e) => e.word);  // ["신다"]

const suffix = await client.dictSearch.searchDict({
  pattern: "아지",
  anchor: DictSearchAnchor.SUFFIX,
  limit: 5,
});
suffix.entries.map((e) => e.word);  // ["아지", "가아지", "강아지", "개아지", "갱아지"]
```

| 표기 | 뜻 |
| --- | --- |
| `다` | 그 음절 그대로 |
| `{초/중/종}` | 한 음절의 자소 조건. 비우거나 `.` 이면 아무거나 |
| `-` (종성 자리) | 받침 없음 |
| `+` (종성 자리) | 받침 있음 |
| `*` | 음절 0개 이상 |
| `?` | 음절 정확히 1개 |

## 오류 처리

`ConnectError` 가 올라오고, 종류는 `Code` 로 가릅니다.

```ts
import { Code, isBareunError, describeError } from "bareun";

try {
  await tagger.tag("문장");
} catch (e) {
  if (isBareunError(e)) {
    if (e.code === Code.PermissionDenied) console.error("API 키를 확인하세요");
    else console.error(describeError(e));
  }
}
```

| 코드 | 언제 |
| --- | --- |
| `Unavailable` | 서버에 닿지 못함 (주소 오타·미기동·CORS) |
| `PermissionDenied` | API 키가 유효하지 않거나 라이선스 만료 |
| `Unimplemented` | 그 서버가 제공하지 않는 서비스 (교정 빌드가 아님) |
| `ResourceExhausted` | 사용량 한도 초과 |

`describeError(e)` 는 무엇을 확인해야 하는지를 붙인 한국어 문장을 돌려줍니다.

## 감싸지 않은 API

`client.language`·`client.revision`·`client.dictSearch`·`client.customDictionary` 는
proto 의 모든 메서드를 그대로 노출합니다. 요청·응답 타입도 함께 내보내므로 직접
만들어 쓸 수 있습니다.

```ts
import { EncodingType } from "bareun";

await client.language.analyzeSyntaxRaw({
  document: { content: "문장", language: "ko_KR" },
  encodingType: EncodingType.UTF16,
});
```

Node 에서 HTTP/2 를 쓰고 싶으면 전송 계층을 직접 넘깁니다.

```ts
import { createConnectTransport } from "@connectrpc/connect-node";

createBareunClient({ apiKey: "koba-...", transport: createConnectTransport({ ... }) });
```

## 1.x 에서 옮겨오기

호환되지 않습니다. 갈아타야 하는 부분은 아래와 같습니다.

| 1.x | 2.0 |
| --- | --- |
| `@grpc/grpc-js` + 런타임에 `.proto` 파싱 | Connect + 생성된 타입 |
| Node 전용 | Node 18+ 와 브라우저 |
| 타입 없음 | TypeScript 로 작성, `.d.ts` 포함 |
| CommonJS 만 | ESM·CJS 모두 |
| 콜백·`Tagger` 클래스 | Promise, `createBareunClient` + `Tagger` |
| 교정·WSD·사전 검색 없음 | 모두 지원 |

## 개발

```bash
pnpm install
pnpm generate      # proto → src/gen (buf)
pnpm typecheck
pnpm test          # 단위 테스트
BAREUN_API_KEY=koba-... pnpm test   # 통합 테스트까지
pnpm build
```

`proto/` 사본은 바른 서버 저장소의 `protos/bareun/*.proto` 에서 가져온 것입니다.
서버 API 가 바뀌면 통째로 다시 복사하고 `pnpm generate` 를 돌립니다.

## 라이선스

BSD 3-Clause
