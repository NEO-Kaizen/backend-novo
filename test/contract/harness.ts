import { once } from "node:events";
import type { Server } from "node:http";
import type { Express } from "express";
import { createApp } from "../../src/app.ts";
import { createContainer } from "../../src/container.ts";
import { loadConfig } from "../../src/platform/config/load-config.ts";

/** Ambiente mínimo válido; a conexão com o banco só abre na primeira consulta. */
export const BASE_ENVIRONMENT = {
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

export interface TestServer {
  readonly baseUrl: string;
  close(): Promise<void>;
}

/** Sobe a aplicação em porta efêmera e devolve o endereço e o encerramento limpo. */
export async function startTestServer(overrides: NodeJS.ProcessEnv = {}): Promise<TestServer> {
  const container = createContainer(loadConfig({ ...BASE_ENVIRONMENT, ...overrides }));
  const app: Express = createApp(container);
  const server = app.listen(0);

  await once(server, "listening");

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("esperava um endereço TCP efêmero do servidor de teste");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close(): Promise<void> {
      // `close()` espera conexões ociosas; derrubar as ativas evita travar a suíte.
      server.closeAllConnections();
      try {
        await closeServer(server);
      } finally {
        await container.database.destroy();
      }
    },
  };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}
