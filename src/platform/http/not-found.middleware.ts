import type { RequestHandler } from "express";
import { AppError } from "../../core/errors/app-error.ts";

/** 404 é rota, não erro: passa pelo error handler para sair no envelope único. */
export function createNotFoundMiddleware(): RequestHandler {
  return (_req, _res, next) => {
    next(new AppError("not_found", 404, "Recurso não encontrado.", { expose: true }));
  };
}
