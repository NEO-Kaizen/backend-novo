import { checkDocsExposure } from "./check-docs-exposure.ts";
import { checkRouteCoverage } from "./check-route-coverage.ts";
import { runRouteCoverageProbe } from "./probe-route-coverage.ts";

/**
 * Guarda do contrato HTTP, executada por `npm run contract:check`.
 *
 * Não é suíte de testes: compara listas (rotas ↔ operações) e a matriz de
 * `DOCS_ENABLED`, sem framework. O `--probe` prova que a guarda de cobertura
 * falha quando deveria, para que um check verde não signifique apenas "não olhou".
 */

/** Ambiente mínimo válido; a conexão com o banco só abre na primeira consulta. */
const BASE_ENVIRONMENT = {
  NODE_ENV: "test",
  DATABASE_HOST: "localhost",
  DATABASE_PORT: "5432",
  DATABASE_NAME: "maat_test",
  DATABASE_USER: "maat",
  DATABASE_PASSWORD: "test-only-password",
  CORS_ORIGINS: "http://localhost:5173",
  JWT_SECRET: "test-only-jwt-secret-with-at-least-32-chars",
  PROTOCOL_SECRET: "test-only-protocol-secret-with-at-least-32-chars",
} satisfies NodeJS.ProcessEnv;

async function main(argv: readonly string[]): Promise<void> {
  if (argv.includes("--probe")) {
    runRouteCoverageProbe();
    writeLine(
      "contract:check --probe: a guarda rota↔operação falha nas divergências e passa no contrato válido.",
    );
    return;
  }

  await checkRouteCoverage(BASE_ENVIRONMENT);
  writeLine("contract:check: cobertura rota↔operação ok.");

  await checkDocsExposure(BASE_ENVIRONMENT);
  writeLine("contract:check: matriz DOCS_ENABLED ok.");
}

/** Saída de CLI vai para o stdout; não é logging de aplicação. */
function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

await main(process.argv);
