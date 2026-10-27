import cors from "cors";
import type { RequestHandler } from "express";
import { REQUEST_ID_HEADER } from "./request-id.middleware.ts";

const ALLOWED_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const ALLOWED_HEADERS = [
  "Content-Type",
  REQUEST_ID_HEADER,
  "X-Requester-Email",
  "X-Requester-Identity",
];

/** Origens explícitas, com credenciais; origem fora da lista não recebe `Access-Control-Allow-Origin`. */
export function createCorsMiddleware(origins: readonly string[]): RequestHandler {
  return cors({
    origin: [...origins],
    credentials: true,
    methods: ALLOWED_METHODS,
    allowedHeaders: ALLOWED_HEADERS,
    exposedHeaders: ["Content-Disposition", REQUEST_ID_HEADER],
  });
}
