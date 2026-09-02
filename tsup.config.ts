import { defineConfig } from "tsup";

// ESM 과 CJS 를 모두 낸다. 1.x 는 CJS 하나뿐이라 ESM 환경에서 쓰기 불편했다.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  // 생성된 proto 코드가 커서, 번들하지 않고 의존으로 두면 사용자가 중복으로 받는다.
  // 라이브러리이므로 의존은 밖으로 뺀다.
  external: ["@bufbuild/protobuf", "@connectrpc/connect", "@connectrpc/connect-web"],
});
