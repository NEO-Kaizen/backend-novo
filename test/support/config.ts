import type { Config } from "../../src/core/config/config.ts";
import { loadConfig } from "../../src/platform/config/load-config.ts";

/**
 * Ambiente mínimo válido para os testes: valores nominais, sem segredo real.
 * O banco não é contactado nesta esteira (`StubDatabase`), então os valores
 * de conexão são placeholders válidos para o schema. `JWT_SECRET` e
 * `PROTOCOL_SECRET` são strings só para os 32 caracteres que o schema exige —
 * valores do ambiente de teste, não credenciais de nenhum ambiente real.
 */
const TEST_ENVIRONMENT: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  PORT: "3000",
  DATABASE_ENGINE: "postgres",
  DATABASE_HOST: "127.0.0.1",
  DATABASE_PORT: "5432",
  DATABASE_NAME: "neo_test",
  DATABASE_USER: "neo",
  DATABASE_PASSWORD: "neo",
  CORS_ORIGINS: "http://localhost:3000",
  JWT_SECRET: "test-jwt-secret-0123456789abcdef-000",
  PROTOCOL_SECRET: "test-protocol-secret-0123456789abcdef-0",
  DOCS_ENABLED: "false",
};

/**
 * Config de teste lida do ambiente injetado (§16), nunca de `process.env`:
 * cada teste entrega o próprio ambiente, com overrides por parâmetro.
 */
export function createTestConfig(overrides: NodeJS.ProcessEnv = {}): Config {
  return loadConfig({ ...TEST_ENVIRONMENT, ...overrides });
}
