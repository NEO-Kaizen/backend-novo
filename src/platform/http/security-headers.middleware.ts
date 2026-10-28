import type { RequestHandler } from "express";
import type { Environment } from "../../core/config/config.ts";

const HSTS_ONE_YEAR = "max-age=31536000; includeSubDomains";

/** Headers mínimos de segurança; HSTS só em produção, onde o TLS é garantido. */
export function createSecurityHeadersMiddleware(environment: Environment): RequestHandler {
  const isProduction = environment === "production";

  return (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");

    if (isProduction) {
      res.setHeader("Strict-Transport-Security", HSTS_ONE_YEAR);
    }

    next();
  };
}
