import type { Request, RequestHandler } from "express";
import type { Logger } from "../../core/service/logger.ts";

const UNMATCHED_ROUTE = "unmatched";

/**
 * Uma linha por requisição, emitida em `finish` ou, quando o cliente desconecta
 * antes, em `close` com `aborted: true`. Só campos da allowlist: sem query
 * string, sem body e sem header — nada de PII.
 */
export function createRequestLoggerMiddleware(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const startedAt = performance.now();
    let logged = false;

    const log = (aborted: boolean): void => {
      if (logged) {
        return;
      }
      logged = true;

      logger.info(
        {
          correlationId: req.id,
          method: req.method,
          route: routeOf(req),
          status: res.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
          ...(aborted ? { aborted } : {}),
        },
        aborted ? "requisição interrompida" : "requisição concluída",
      );
    };

    res.once("finish", () => {
      log(false);
    });
    res.once("close", () => {
      // `close` também segue `finish`; só conta como aborto se a resposta não terminou.
      log(!res.writableEnded);
    });

    next();
  };
}

function routeOf(req: Request): string {
  const route: unknown = req.route;

  if (typeof route === "object" && route !== null && "path" in route) {
    const path = route.path;
    if (typeof path === "string") {
      return `${req.baseUrl}${path}`;
    }
  }

  return UNMATCHED_ROUTE;
}
