import type { ErrorRequestHandler } from "express";
import {
  errorEnvelope,
  GENERIC_ERROR_MESSAGE,
  SERVER_ERROR_STATUS,
} from "../../core/http/error-envelope.ts";
import { toAppError } from "../../core/http/error-mapper.ts";
import type { Logger } from "../../core/service/logger.ts";

/**
 * Borda do erro: loga a causa uma única vez e responde no envelope legado
 * (ADR-0005) com `code` e `requestId` aditivos. Erro não exposto vira
 * `internal_error` — código interno nunca chega ao cliente. Stack, SQL e path
 * também nunca saem.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const appError = toAppError(error);
    const fields = {
      correlationId: req.id,
      code: appError.code,
      status: appError.status,
      err: error,
    };

    if (appError.status >= SERVER_ERROR_STATUS) {
      logger.error(fields, "falha ao processar requisição");
    } else {
      logger.warn(fields, "requisição recusada");
    }

    res.status(appError.status).json(
      errorEnvelope(appError.status, appError.expose ? appError.message : GENERIC_ERROR_MESSAGE, {
        code: appError.expose ? appError.code : "internal_error",
        requestId: req.id,
      }),
    );
  };
}
