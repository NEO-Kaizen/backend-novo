import type { Server } from "node:http";
import { createApp } from "./app.ts";
import { createContainer } from "./container.ts";
import { loadConfig } from "./platform/config/load-config.ts";

const SHUTDOWN_SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
const SHUTDOWN_TIMEOUT_MS = 10_000;

function start(): void {
  const config = loadConfig();
  const container = createContainer(config);
  const app = createApp(container);

  const server = app.listen(config.port, () => {
    container.logger.info(
      { port: config.port, environment: config.environment },
      "servidor iniciado",
    );
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    container.logger.info({ signal }, "encerrando servidor");

    const forceExit = setTimeout(() => {
      container.logger.warn({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, "tempo de encerramento esgotado");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      await closeServer(server);
      await container.database.destroy();
      process.exit(0);
    } catch (cause) {
      container.logger.error({ err: cause }, "falha ao encerrar o servidor");
      process.exit(1);
    }
  };

  for (const signal of SHUTDOWN_SIGNALS) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

try {
  start();
} catch (error) {
  // Ainda não há logger: configuração inválida impede criá-lo.
  const message = error instanceof Error ? error.message : "Falha ao iniciar o servidor";
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
