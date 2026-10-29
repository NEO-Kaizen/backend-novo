import { once } from "node:events";
import type { Server } from "node:http";
import { createApp } from "../app.ts";
import { createContainer } from "../container.ts";
import type { Container } from "../container.ts";
import {
  DOCS_UI_PUBLIC_PATH,
  OPENAPI_SPEC_PUBLIC_PATH,
  SCALAR_BUNDLE_PUBLIC_PATH,
} from "../core/http/api-base-path.ts";
import { loadConfig } from "../platform/config/load-config.ts";
import { OPENAPI_SPEC_VERSION } from "./openapi.ts";

/** Toda chamada HTTP da guarda tem teto; um servidor que não responde falha, não trava o CI. */
const REQUEST_TIMEOUT_MS = 5_000;

interface RunningServer {
  readonly baseUrl: string;
  close(): Promise<void>;
}

type DocsExpectation = "exposed" | "hidden";

interface DocsScenario {
  readonly name: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly expectation: DocsExpectation;
}

interface DocsResponse {
  readonly scenario: DocsScenario;
  readonly label: string;
  readonly response: Response;
}

const DOCS_SCENARIOS: readonly DocsScenario[] = [
  {
    name: "produção sem DOCS_ENABLED",
    environment: { NODE_ENV: "production" },
    expectation: "hidden",
  },
  {
    name: "produção com DOCS_ENABLED=true",
    environment: { NODE_ENV: "production", DOCS_ENABLED: "true" },
    expectation: "exposed",
  },
  { name: "teste sem DOCS_ENABLED", environment: {}, expectation: "exposed" },
  {
    name: "desenvolvimento com DOCS_ENABLED=false",
    environment: { NODE_ENV: "development", DOCS_ENABLED: "false" },
    expectation: "hidden",
  },
];

/** Prova que spec, UI e bundle local respondem conforme `DOCS_ENABLED` e o ambiente. */
export async function checkDocsExposure(baseEnvironment: NodeJS.ProcessEnv): Promise<void> {
  await Promise.all(DOCS_SCENARIOS.map((scenario) => checkDocsScenario(scenario, baseEnvironment)));
}

async function checkDocsScenario(
  scenario: DocsScenario,
  baseEnvironment: NodeJS.ProcessEnv,
): Promise<void> {
  const server = await startServer({ ...baseEnvironment, ...scenario.environment });

  try {
    const [spec, ui] = await Promise.all([
      sendRequest(`${server.baseUrl}${OPENAPI_SPEC_PUBLIC_PATH}`),
      sendRequest(`${server.baseUrl}${DOCS_UI_PUBLIC_PATH}`),
    ]);

    const specResponse = toDocsResponse(scenario, "spec", spec);
    const uiResponse = toDocsResponse(scenario, "UI", ui);

    if (scenario.expectation === "exposed") {
      await assertDocsExposed(server.baseUrl, specResponse, uiResponse);
    } else {
      await assertDocsHidden(specResponse, uiResponse);
    }
  } finally {
    await server.close();
  }
}

function toDocsResponse(scenario: DocsScenario, label: string, response: Response): DocsResponse {
  return { scenario, label, response };
}

async function assertDocsHidden(spec: DocsResponse, ui: DocsResponse): Promise<void> {
  assertStatus(spec, 404);
  assertStatus(ui, 404);
  await assertCode(spec, "not_found");
  await assertCode(ui, "not_found");
}

async function assertDocsExposed(
  baseUrl: string,
  spec: DocsResponse,
  ui: DocsResponse,
): Promise<void> {
  assertStatus(spec, 200);
  assertStatus(ui, 200);

  const version = readField(await spec.response.json(), "openapi");
  if (version !== OPENAPI_SPEC_VERSION) {
    throw new Error(
      `${spec.scenario.name}: o spec respondeu OpenAPI ${String(version ?? "desconhecido")}, esperava ${OPENAPI_SPEC_VERSION}.`,
    );
  }

  const html = await ui.response.text();
  if (!html.includes(SCALAR_BUNDLE_PUBLIC_PATH)) {
    throw new Error(
      `${ui.scenario.name}: a UI não referencia o bundle local ${SCALAR_BUNDLE_PUBLIC_PATH}.`,
    );
  }
  if (/jsdelivr/i.test(html)) {
    throw new Error(`${ui.scenario.name}: a UI ainda carrega o Scalar de CDN.`);
  }

  const asset = toDocsResponse(
    spec.scenario,
    "bundle local",
    await sendRequest(`${baseUrl}${SCALAR_BUNDLE_PUBLIC_PATH}`, "HEAD"),
  );
  assertStatus(asset, 200);

  if (!/javascript/.test(asset.response.headers.get("content-type") ?? "")) {
    throw new Error(`${asset.scenario.name}: o bundle local não respondeu como JavaScript.`);
  }
}

function assertStatus(target: DocsResponse, expected: number): void {
  if (target.response.status !== expected) {
    throw new Error(
      `${target.scenario.name}: ${target.label} respondeu ${target.response.status}, esperava ${expected}.`,
    );
  }
}

async function assertCode(target: DocsResponse, expected: string): Promise<void> {
  const code = readField(await target.response.json(), "code");

  if (code !== expected) {
    throw new Error(
      `${target.scenario.name}: ${target.label} respondeu code "${String(code)}", esperava "${expected}".`,
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
  const container = createContainer(loadConfig(environment));
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
      throw new AggregateError(
        [error, cleanupError],
        "falha ao iniciar o servidor e ao limpar os recursos",
      );
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
