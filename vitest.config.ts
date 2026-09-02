import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 통합 테스트는 살아 있는 서버가 필요해 따로 둔다. BAREUN_API_KEY 가 없으면
    // 스스로 건너뛰므로 여기서 제외하지는 않는다.
    include: ["test/**/*.test.ts"],
  },
});
