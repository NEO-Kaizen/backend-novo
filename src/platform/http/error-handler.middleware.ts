import type { ErrorRequestHandler } from "express";
import { errorEnvelope, isServerError } from "../../core/http/error-envelope.ts";
import { toExposedError } from "../../core/http/error-mapper.ts";
import type { Logger } from "../../core/service/logger.ts";
import { toHttpAppError } from "./transport-error-mapper.ts";

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

    // Cliente desconectou: não há socket para responder e o request logger já
    // registra a requisição como abortada. Desconexão é transporte, não entrada.
    if (req.destroyed || res.destroyed) {
      return;
    }

    const appError = toHttpAppError(error);
    const { code, message, status } = toExposedError(appError);
    const fields = {
      correlationId: req.id,
      code: appError.code,
      status,
    };

    if (isServerError(status)) {
      // 5xx: a causa bruta entra no log para diagnóstico.
      logger.error({ ...fields, err: error }, "falha ao processar requisição");
    } else {
      // 4xx: sem mensagem/stack crus — o parser pode ecoar trecho do body.
      logger.warn(fields, "requisição recusada");
    }

    res.status(status).json(errorEnvelope(status, message, { code, requestId: req.id }));
  };
}
