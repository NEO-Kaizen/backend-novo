import { once } from "node:events";
import type { Server } from "node:http";
import express from "express";
import { createApp } from "../app.ts";
import { createContainer } from "../container.ts";
import { API_BASE_PATH } from "../core/http/api-base-path.ts";
import { loadConfig } from "../platform/config/load-config.ts";
import { createOpenApiDocument } from "./openapi.ts";
import { assertRouteCoverage } from "./route-coverage.ts";

/**
 * Guarda do contrato HTTP, executada por `npm run contract:check`.
 *
 * Não é suíte de testes: compara listas (rotas ↔ operações) e a matriz de
 * `DOCS_ENABLED`, sem framework. O `--probe` prova que a guarda falha quando
 * deveria, para que um check verde não signifique apenas "não olhou".
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

const SCALAR_BUNDLE_ROUTE = `${API_BASE_PATH}/docs/assets/standalone.js`;

interface RunningServer {
  readonly baseUrl: string;
  close(): Promise<void>;
}

interface DocsScenario {
  readonly name: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly exposed: boolean;
}

const DOCS_SCENARIOS: readonly DocsScenario[] = [
  { name: "produção sem DOCS_ENABLED", environment: { NODE_ENV: "production" }, exposed: false },
  {
    name: "produção com DOCS_ENABLED=true",
    environment: { NODE_ENV: "production", DOCS_ENABLED: "true" },
    exposed: true,
  },
  { name: "teste sem DOCS_ENABLED", environment: {}, exposed: true },
  {
    name: "desenvolvimento com DOCS_ENABLED=false",
    environment: { NODE_ENV: "development", DOCS_ENABLED: "false" },
    exposed: false,
  },
];

async function main(argv: readonly string[]): Promise<void> {
  if (argv.includes("--probe")) {
    runProbe();
    console.log(
      "contract:check --probe: a guarda falha nas divergências e passa no contrato válido.",
    );
    return;
  }

  await checkRouteCoverage();
  console.log("contract:check: cobertura rota↔operação ok.");

  await checkDocsMatrix();
  console.log("contract:check: matriz DOCS_ENABLED ok.");
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
  for (const scenario of DOCS_SCENARIOS) {
    await checkDocsScenario(scenario);
  }
}

async function checkDocsScenario(scenario: DocsScenario): Promise<void> {
  const server = await startServer(scenario.environment);

  try {
    const spec = await fetch(`${server.baseUrl}${API_BASE_PATH}/openapi.json`);
    const ui = await fetch(`${server.baseUrl}${API_BASE_PATH}/docs`);

    if (!scenario.exposed) {
      assertStatus(scenario, "spec", spec.status, 404);
      assertStatus(scenario, "UI", ui.status, 404);
      assertCode(scenario, "spec", await spec.json(), "not_found");
      assertCode(scenario, "UI", await ui.json(), "not_found");
      return;
    }

    assertStatus(scenario, "spec", spec.status, 200);
    assertStatus(scenario, "UI", ui.status, 200);

    const document = (await spec.json()) as { openapi?: string };
    if (document.openapi !== "3.1.0") {
      throw new Error(
        `${scenario.name}: o spec respondeu OpenAPI ${document.openapi ?? "desconhecido"}, esperava 3.1.0.`,
      );
    }

    const html = await ui.text();
    if (!html.includes(SCALAR_BUNDLE_ROUTE)) {
      throw new Error(
        `${scenario.name}: a UI não referencia o bundle local ${SCALAR_BUNDLE_ROUTE}.`,
      );
    }
    if (/jsdelivr/i.test(html)) {
      throw new Error(`${scenario.name}: a UI ainda carrega o Scalar de CDN.`);
    }

    const asset = await fetch(`${server.baseUrl}${SCALAR_BUNDLE_ROUTE}`, { method: "HEAD" });
    assertStatus(scenario, "bundle local", asset.status, 200);

    if (!/javascript/.test(asset.headers.get("content-type") ?? "")) {
      throw new Error(`${scenario.name}: o bundle local não respondeu como JavaScript.`);
    }
  } finally {
    await server.close();
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
  const code = (body as { code?: string }).code;

  if (code !== expected) {
    throw new Error(`${scenario.name}: ${label} respondeu code "${code}", esperava "${expected}".`);
  }
}

async function startServer(environment: NodeJS.ProcessEnv): Promise<RunningServer> {
  const container = createContainer(loadConfig({ ...BASE_ENVIRONMENT, ...environment }));
  const server = createApp(container).listen(0);

  await once(server, "listening");

  const address = server.address();
  if (address === null || typeof address === "string") {
    await container.database.destroy();
    throw new Error("esperava um endereço TCP efêmero do servidor");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close(): Promise<void> {
      server.closeAllConnections();
      await closeServer(server);
      await container.database.destroy();
    },
  };
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
      const app = express();
      const router = express.Router();
      router.get("/probe", (_req, res) => {
        res.sendStatus(204);
      });
      app.use(API_BASE_PATH, router);

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
    "parâmetros divergentes",
    () => {
      const app = express();
      const router = express.Router();
      router.get("/probe/:id", (_req, res) => {
        res.sendStatus(200);
      });
      app.use(API_BASE_PATH, router);

      assertRouteCoverage(app, { paths: { "/probe/{other}": { get: {} } } });
    },
    /parâmetros/,
  );

  probeFailure(
    "router.all exige todos os métodos",
    () => {
      const app = express();
      const router = express.Router();
      router.all("/probe", (_req, res) => {
        res.sendStatus(204);
      });
      app.use(API_BASE_PATH, router);

      assertRouteCoverage(app, { paths: {} });
    },
    /GET \/probe/,
  );

  probeSuccess("rota e operação coincidem", () => {
    const app = express();
    const router = express.Router();
    router.get("/probe/:id", (_req, res) => {
      res.sendStatus(200);
    });
    app.use(API_BASE_PATH, router);

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

function probeFailure(name: string, run: () => void, expected: RegExp): void {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`sonda "${name}": a guarda falhou indevidamente: ${message}`, { cause: error });
  }
}

await main(process.argv);
