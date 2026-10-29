import { defineConfig } from "vitest/config";

/**
 * Esteira de confiança: engines reais (Postgres, MySQL, SQLite) provando
 * migrations, seeds, constraints e transações. Enquanto a #28 não entrega
 * o schema, a suíte está vazia e sai 0 por `passWithNoTests` — remover
 * quando o primeiro teste de integração entrar (arquivo com sufixo
 * .integration.test.ts).
 *
 * Coverage e paralelismo por worker entram com o helper de banco (#28/#70
 * fase 2); o `coverage` root-only seria igual ao da esteira rápida.
 */
export default defineConfig({
  test: {
    include: ["test/**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["test/setup.ts"],
    environment: "node",
    env: { TZ: "UTC" },
    passWithNoTests: true,
    // Cada suíte isola o próprio schema; paralelismo entre arquivos entra
    // com schema/worker quando a #28 trouxer o helper de banco.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
