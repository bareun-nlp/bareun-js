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

await c.correct("이거 안돼요. 학교에 갔읍니다.");
// "이거 안돼요. 학교에 갔습니다."

for (const ch of await c.changes("이거 안돼요. 학교에 갔읍니다.")) {
  console.log(`${ch.origin} → ${ch.revised} (${ch.category})`);
}
// 갔읍니다. → 갔습니다. (STANDARD)
```

중첩 교정이나 도움말까지 보려면 `c.raw(text)` 로 서버 응답을 그대로 받습니다.

## 긴 글 (잘림 안내)

서버가 글 길이 기준을 켜 둔 경우(공개 API `api.bareun.ai` 는 5,000자), 기준을 넘는 글은
거절하지 않고 **앞 5,000자 안팎만 처리**합니다. 5,000자까지는 전부 처리하고, 5,001자부터
잘립니다. 잘린 응답에는 `truncation` 이 실리고, 기준 안의 글에는 붙지 않습니다.
결과의 위치(`beginOffset`)는 어느 경우에나 원문 처음 기준입니다.
긴 글은 아래 "긴 문서는 세션으로 나눠 보내기"처럼 조각으로 나눠 보내는 것을 권합니다.

```ts
const t = await tagger.tag(longText);
if (t.truncated) {
  console.log(t.truncation);
  // { originalChars: 9001, processedChars: 4991, droppedChars: 4010,
  //   droppedBeginOffset: 4991, message: "요청 글이 너무 길어 ...", cutMidWord: false }
  const rest = t.droppedText();  // 처리하지 않은 뒷부분. 따로 다시 보내면 된다.
}

const r = await new Corrector(client).correctDetailed(longText);
r.revised;      // 앞부분의 교정 결과
r.truncation;   // 잘리지 않았으면 undefined
r.droppedText;  // 처리하지 않은 뒷부분(잘리지 않았으면 "")
```

| 필드 | 뜻 |
| --- | --- |
| `originalChars` | 요청 글 전체의 글자 수 |
| `processedChars` | 처리한 글자 수 |
| `droppedChars` | 버린 글자 수 |
| `droppedBeginOffset` | 버린 구간의 시작 위치(UTF-16 기준이라 `text.slice(...)` 에 그대로 넣는다) |
| `message` | 서버가 준 안내 문구 |
| `cutMidWord` | 문장 끝·공백을 못 찾아 글자 중간에서 잘랐으면 true. 마지막 어절은 믿기 어렵다 |

`Corrector.correct()` 는 교정문만 돌려주므로 잘렸는지 알 수 없습니다. 긴 글을 다룰 때는
`correctDetailed()` 를 쓰세요. 서버가 이 필드를 모르던 시절의 서버에서는 항상 `undefined` 입니다.

## 긴 문서는 세션으로 나눠 보내기

긴 글은 세션(`OpenSession`·`CloseSession`)을 열고 문단 단위로 보내는 것을 권장합니다.
세션 안의 요청들은 한 문서로 이어진 것으로 다뤄집니다. 앞 문단에서 확정한 미등록어와
문맥, 사용자 사전, 교정기 옵션이 뒤 문단에 이어집니다. 미등록 단어는 두 번 이상 나와야
알려진 말로 확정하므로, 앞에서 본 단어가 뒤의 교정에 반영됩니다.

사용자 사전과 교정기 옵션은 세션을 **열 때** 정하고, 이후 호출에서는 줄 수 없습니다.
5,000자 기준은 세션 안의 요청 하나하나에도 걸리므로 문단은 5,000자 이하로 나눕니다.

```ts
import { Corrector } from "bareun";

const session = await new Corrector(client).openSession({ customDictNames: ["mydict"] });
try {
  const out: string[] = [];
  for (const paragraph of paragraphs) {
    out.push(await session.correct(paragraph));
  }
} finally {
  await session.close();  // 안 닫아도 유휴 10분 뒤 닫히지만, 닫으면 동시 세션 상한을 바로 돌려받는다
}
```

| 메서드 | 하는 일 |
| --- | --- |
| `session.correct(text)` | 교정문만 |
| `session.correctDetailed(text)` | 교정문 + 잘림 정보 + 세션 개정 번호 |
| `session.events(sinceRevision?)` | 세션이 새 단어를 확정한 사건 목록. 앞 호출의 답이 달라졌을 수 있는지 알아볼 때 |
| `session.close()` | 세션을 닫음 |

세션은 유휴 10분, 열린 지 1시간이 지나면 닫히고, API 키마다 동시에 열 수 있는 수에
상한이 있습니다(넘으면 `ResourceExhausted`). 세션 문제는 `sessionErrorReason(e)` 로 가릅니다.

| 이유 | 하면 되는 일 |
| --- | --- |
| `SESSION_NOT_FOUND`, `SESSION_EXPIRED` | 세션을 새로 열고 필요한 앞부분을 다시 보낸다 |
| `SESSION_STORE_UNAVAILABLE` | 세션을 다시 열지 말고 잠시 뒤 다시 한다. 급하면 세션 없이 `correct()` 로 보낸다 |

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

## 배포

태그를 밀면 GitHub Actions 가 npm 에 올립니다.

```bash
npm version 2.0.1        # package.json 갱신 + 커밋 + v2.0.1 태그
git push && git push --tags
```

태그와 `package.json` 의 버전이 다르면 배포하지 않고 멈춥니다. 잘못 붙인 태그로
엉뚱한 버전이 나가는 것을 막기 위해서입니다. npm 은 되돌리기가 사실상 불가능합니다
(unpublish 는 24시간 안에만, 그마저도 조건이 붙습니다).

Actions 탭에서 손으로 돌릴 수도 있습니다. 그때는 `dry_run` 을 켜서 무엇이
올라가는지 먼저 확인하세요.

### NPM_TOKEN 준비 (한 번만)

워크플로가 쓰는 시크릿은 `NPM_TOKEN` 하나입니다. Automation 토큰이어야 합니다 —
2FA 가 켜진 계정에서도 OTP 없이 배포되기 때문입니다.

1. [npmjs.com](https://www.npmjs.com) 에 `bareun` 패키지를 관리하는 계정으로 로그인합니다.
2. 오른쪽 위 아바타 → **Access Tokens** → **Generate New Token** → **Classic Token**
3. 종류는 **Automation** 을 고릅니다.
   - `Publish` 는 사람이 OTP 를 넣어야 해서 CI 에서 쓸 수 없습니다.
   - `Read-only` 는 배포가 되지 않습니다.
4. 만들어진 토큰을 복사합니다. **다시 볼 수 없습니다.**
5. 이 저장소 → **Settings** → **Secrets and variables** → **Actions**
   → **New repository secret**
   - Name: `NPM_TOKEN`
   - Secret: 복사한 토큰

세분화된 접근 토큰(Granular Access Token)을 쓰려면 `bareun` 패키지에
**Read and write** 권한을 주고, 만료일을 달력에 적어 두세요. 만료되면 배포가
조용히 실패합니다.

### provenance

공개 저장소라 [npm provenance](https://docs.npmjs.com/generating-provenance-statements)
를 붙입니다. 어느 저장소의 어느 커밋에서 만들어졌는지가 npm 페이지에 증명으로
남습니다. 워크플로의 `id-token: write` 권한이 그것 때문에 필요합니다.

## 라이선스

BSD 3-Clause
