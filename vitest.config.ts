import { defineConfig } from "vitest/config";

/**
 * Esteira rápida: unitário e HTTP contra `createApp(container)` em loopback.
 * Sem banco real, Docker ou rede externa — a esteira lenta fica em
 * `vitest.integration.config.ts` e roda por `npm run test:integration`.
 */
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "test/**/*.integration.test.ts"],
    setupFiles: ["test/setup.ts"],
    environment: "node",
    env: { TZ: "UTC" },
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "coverage/fast",
      include: ["src/**/*.ts"],
      // `server.ts` sobe servidor real; o contrato HTTP é provado por
      // `npm run contract:check`, não pela cobertura.
      exclude: ["src/server.ts", "src/api-contract/**"],
      clean: true,
    },
  },
});
