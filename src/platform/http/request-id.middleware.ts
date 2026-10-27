import type { RequestHandler } from "express";
import { z } from "zod";
import type { IdGenerator } from "../../core/service/id-generator.ts";

export const REQUEST_ID_HEADER = "x-request-id";

const UuidSchema = z.uuid();

/**
 * Aceita `x-request-id` apenas se for UUID válido; senão gera um.
 * O id é ecoado na resposta e fica disponível em `req.id`; no log ele aparece
 * como `correlationId` (C11).
 */
export function createRequestIdMiddleware(ids: IdGenerator): RequestHandler {
  return (req, res, next) => {
    const received = req.get(REQUEST_ID_HEADER);
    const id =
      received !== undefined && UuidSchema.safeParse(received).success ? received : ids.next();

    req.id = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  };
}
