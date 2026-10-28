import { once } from "node:events";
import type { Server } from "node:http";
import express, { Router } from "express";
import type { Express } from "express";
import { createApp } from "../app.ts";
import { createContainer } from "../container.ts";
import type { Container } from "../container.ts";
import {
  API_BASE_PATH,
  DOCS_UI_PUBLIC_PATH,
  OPENAPI_SPEC_PUBLIC_PATH,
  SCALAR_BUNDLE_PUBLIC_PATH,
} from "../core/http/api-base-path.ts";
import { loadConfig } from "../platform/config/load-config.ts";
import { createOpenApiDocument, OPENAPI_SPEC_VERSION } from "./openapi.ts";
import { assertRouteCoverage } from "./route-coverage.ts";

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

/** Toda chamada HTTP da guarda tem teto; um servidor que não responde falha, não trava o CI. */
const REQUEST_TIMEOUT_MS = 5_000;

interface RunningServer {
  readonly baseUrl: string;
  close(): Promise<void>;
}

interface DocsScenario {
  readonly name: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly isExposed: boolean;
}

const DOCS_SCENARIOS: readonly DocsScenario[] = [
  {
    name: "produção sem DOCS_ENABLED",
    environment: { NODE_ENV: "production" },
    isExposed: false,
  },
  {
    name: "produção com DOCS_ENABLED=true",
    environment: { NODE_ENV: "production", DOCS_ENABLED: "true" },
    isExposed: true,
  },
  { name: "teste sem DOCS_ENABLED", environment: {}, isExposed: true },
  {
    name: "desenvolvimento com DOCS_ENABLED=false",
    environment: { NODE_ENV: "development", DOCS_ENABLED: "false" },
    isExposed: false,
  },
];

async function main(argv: readonly string[]): Promise<void> {
  if (argv.includes("--probe")) {
    runProbe();
    report(
      "contract:check --probe: a guarda rota↔operação falha nas divergências e passa no contrato válido.",
    );
    return;
  }

  await checkRouteCoverage();
  report("contract:check: cobertura rota↔operação ok.");

  await checkDocsMatrix();
  report("contract:check: matriz DOCS_ENABLED ok.");
}

/** Cobre o app real contra o documento gerado, como o CI vai cobrar cada domínio. */
async function checkRouteCoverage(): Promise<void> {
  const container = createContainer(loadConfig(BASE_ENVIRONMENT));

  try {
    assertRouteCoverage(createApp(container), createOpenApiDocument());
  } finally {
    await container.database.destroy();
  }
}

/** Prova que spec, UI e bundle local respondem conforme `DOCS_ENABLED` e o ambiente. */
async function checkDocsMatrix(): Promise<void> {
  await Promise.all(DOCS_SCENARIOS.map((scenario) => checkDocsScenario(scenario)));
}

async function checkDocsScenario(scenario: DocsScenario): Promise<void> {
  const server = await startServer(scenario.environment);

  try {
    const [spec, ui] = await Promise.all([
      sendRequest(`${server.baseUrl}${OPENAPI_SPEC_PUBLIC_PATH}`),
      sendRequest(`${server.baseUrl}${DOCS_UI_PUBLIC_PATH}`),
    ]);

    if (scenario.isExposed) {
      await assertDocsExposed(scenario, server.baseUrl, spec, ui);
    } else {
      await assertDocsHidden(scenario, spec, ui);
    }
  } finally {
    await server.close();
  }
}

async function assertDocsHidden(
  scenario: DocsScenario,
  spec: Response,
  ui: Response,
): Promise<void> {
  assertStatus(scenario, "spec", spec.status, 404);
  assertStatus(scenario, "UI", ui.status, 404);
  assertCode(scenario, "spec", await spec.json(), "not_found");
  assertCode(scenario, "UI", await ui.json(), "not_found");
}

async function assertDocsExposed(
  scenario: DocsScenario,
  baseUrl: string,
  spec: Response,
  ui: Response,
): Promise<void> {
  assertStatus(scenario, "spec", spec.status, 200);
  assertStatus(scenario, "UI", ui.status, 200);

  const version = readField(await spec.json(), "openapi");
  if (version !== OPENAPI_SPEC_VERSION) {
    throw new Error(
      `${scenario.name}: o spec respondeu OpenAPI ${String(version ?? "desconhecido")}, esperava ${OPENAPI_SPEC_VERSION}.`,
    );
  }

  const html = await ui.text();
  if (!html.includes(SCALAR_BUNDLE_PUBLIC_PATH)) {
    throw new Error(
      `${scenario.name}: a UI não referencia o bundle local ${SCALAR_BUNDLE_PUBLIC_PATH}.`,
    );
  }
  if (/jsdelivr/i.test(html)) {
    throw new Error(`${scenario.name}: a UI ainda carrega o Scalar de CDN.`);
  }

  const asset = await sendRequest(`${baseUrl}${SCALAR_BUNDLE_PUBLIC_PATH}`, "HEAD");
  assertStatus(scenario, "bundle local", asset.status, 200);

  if (!/javascript/.test(asset.headers.get("content-type") ?? "")) {
    throw new Error(`${scenario.name}: o bundle local não respondeu como JavaScript.`);
  }
}

function assertStatus(
  scenario: DocsScenario,
  label: string,
  actual: number,
  expected: number,
): void {
  if (actual !== expected) {
    throw new Error(`${scenario.name}: ${label} respondeu ${actual}, esperava ${expected}.`);
  }
}

function assertCode(scenario: DocsScenario, label: string, body: unknown, expected: string): void {
  const code = readField(body, "code");

  if (code !== expected) {
    throw new Error(
      `${scenario.name}: ${label} respondeu code "${String(code)}", esperava "${expected}".`,
    );
  }
}

/** Lê um campo de um corpo JSON sem confiar no shape; `unknown` até o teste. */
function readField(body: unknown, field: string): unknown {
  return typeof body === "object" && body !== null && field in body
    ? (body as Record<string, unknown>)[field]
    : undefined;
}

function sendRequest(url: string, method = "GET"): Promise<Response> {
  return fetch(url, { method, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

async function startServer(environment: NodeJS.ProcessEnv): Promise<RunningServer> {
  const container = createContainer(loadConfig({ ...BASE_ENVIRONMENT, ...environment }));
  const server = createApp(container).listen(0);

  try {
    await once(server, "listening");

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("esperava um endereço TCP efêmero do servidor");
    }

    return {
      baseUrl: `http://127.0.0.1:${address.port}`,
      close: () => shutdown(server, container),
    };
  } catch (error) {
    await shutdown(server, container).catch((cleanupError: unknown) => {
      report(`contract:check: falha ao limpar o servidor: ${readMessage(cleanupError)}`);
    });
    throw error;
  }
}

async function shutdown(server: Server, container: Container): Promise<void> {
  server.closeAllConnections();
  await closeServer(server);
  await container.database.destroy();
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

/** Sondas da própria guarda: cada caso prova que o algoritmo falha (ou passa) quando deve. */
function runProbe(): void {
  probeFailure(
    "rota sem operação",
    () => {
      const app = probeApp((router) => {
        router.get("/probe", (_req, res) => {
          res.sendStatus(204);
        });
      });

      assertRouteCoverage(app, { paths: {} });
    },
    /GET \/probe/,
  );

  probeFailure(
    "operação sem rota",
    () => {
      assertRouteCoverage(express(), { paths: { "/probe": { get: {} } } });
    },
    /Operação GET \/probe não tem rota alcançável/,
  );

  probeFailure(
    "operação em rota de infraestrutura",
    () => {
      const app = probeApp((router) => {
        router.get("/openapi.json", (_req, res) => {
          res.sendStatus(200);
        });
      });

      assertRouteCoverage(app, { paths: { "/openapi.json": { get: {} } } });
    },
    /infraestrutura/,
  );

  probeFailure(
    "parâmetros divergentes",
    () => {
      const app = probeApp((router) => {
        router.get("/probe/:id", (_req, res) => {
          res.sendStatus(200);
        });
      });

      assertRouteCoverage(app, { paths: { "/probe/{other}": { get: {} } } });
    },
    /parâmetros/,
  );

  probeFailure(
    "router.all exige todos os métodos",
    () => {
      const app = probeApp((router) => {
        router.all("/probe", (_req, res) => {
          res.sendStatus(204);
        });
      });

      assertRouteCoverage(app, { paths: {} });
    },
    /GET \/probe/,
  );

  probeSuccess("rota e operação coincidem", () => {
    const app = probeApp((router) => {
      router.get("/probe/:id", (_req, res) => {
        res.sendStatus(200);
      });
    });

    assertRouteCoverage(app, { paths: { "/probe/{id}": { get: {} } } });
  });

  probeSuccess("/health é excluída do contrato", () => {
    const app = express();
    app.get("/health", (_req, res) => {
      res.sendStatus(200);
    });

    assertRouteCoverage(app, { paths: {} });
  });
}

function probeApp(register: (router: Router) => void): Express {
  const app = express();
  const router = Router();
  register(router);
  app.use(API_BASE_PATH, router);
  return app;
}

function probeFailure(name: string, run: () => void, expected: RegExp): void {
  try {
    run();
  } catch (error) {
    const message = readMessage(error);

    if (!expected.test(message)) {
      throw new Error(`sonda "${name}": falhou com mensagem inesperada: ${message}`, {
        cause: error,
      });
    }

    return;
  }

  throw new Error(`sonda "${name}": a guarda não falhou.`);
}

function probeSuccess(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    throw new Error(`sonda "${name}": a guarda falhou indevidamente: ${readMessage(error)}`, {
      cause: error,
    });
  }
}

function readMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Saída de CLI vai para o stdout; não é logging de aplicação. */
function report(message: string): void {
  process.stdout.write(`${message}\n`);
}

await main(process.argv);
