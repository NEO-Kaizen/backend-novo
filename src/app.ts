import cookieParser from "cookie-parser";
import express from "express";
import type { Express } from "express";
import type { Container } from "./container.ts";
import { API_BASE_PATH } from "./core/http/api-base-path.ts";
import { createCorsMiddleware } from "./platform/http/cors.middleware.ts";
import { createErrorHandler } from "./platform/http/error-handler.middleware.ts";
import { createNotFoundMiddleware } from "./platform/http/not-found.middleware.ts";
import { createRequestIdMiddleware } from "./platform/http/request-id.middleware.ts";
import { createRequestLoggerMiddleware } from "./platform/http/request-logger.middleware.ts";
import { createSecurityHeadersMiddleware } from "./platform/http/security-headers.middleware.ts";

const HEALTH_STATUS = { status: "ok" };

/**
 * Monta o Express a partir do container pronto: `app.ts` não cria dependência,
 * então a aplicação sobe em teste sem `listen`.
 */
export function createApp(container: Container): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(createRequestIdMiddleware(container.ids));
  app.use(createRequestLoggerMiddleware(container.logger));
  app.use(createSecurityHeadersMiddleware(container.config.environment));
  app.use(createCorsMiddleware(container.config.cors.origins));
  app.use(express.json({ limit: container.config.uploads.jsonBodyMaxBytes }));
  app.use(cookieParser());

  // Sonda de infraestrutura: fora de `/api/v1` e sem autenticação.
  app.get("/health", (_req, res) => {
    res.status(200).json(HEALTH_STATUS);
  });

  // Documentação é infraestrutura: fica fora do contrato e da cobertura de rotas.
  if (container.apiContractRouter !== null) {
    app.use(API_BASE_PATH, container.apiContractRouter);
  }

  app.use(createNotFoundMiddleware());
  app.use(createErrorHandler(container.logger)); // quatro parâmetros, sempre por último
  return app;
}
