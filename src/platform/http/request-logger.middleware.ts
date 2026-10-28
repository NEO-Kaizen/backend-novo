import type { Request, RequestHandler } from "express";
import type { Logger } from "../../core/service/logger.ts";

const UNMATCHED_ROUTE = "unmatched";

type RequestLogOutcome = "completed" | "aborted";

/** Allowlist do log de requisição: nenhum campo fora daqui. */
type RequestLogFields = Readonly<{
  correlationId: string;
  method: string;
  route: string;
  status: number;
  durationMs: number;
  aborted?: true;
}>;

/**
 * Uma linha por requisição, emitida em `finish` ou, quando o cliente desconecta
 * antes, em `close` com `aborted: true`. Só campos da allowlist: sem query
 * string, sem body e sem header — nada de PII.
 */
export function createRequestLoggerMiddleware(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const startedAt = performance.now();
    let hasLogged = false;

    const logOnce = (outcome: RequestLogOutcome): void => {
      if (hasLogged) {
        return;
      }
      hasLogged = true;

      const isAborted = outcome === "aborted";
      const fields: RequestLogFields = {
        correlationId: req.id,
        method: req.method,
        route: routeOf(req),
        status: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
        ...(isAborted ? { aborted: true as const } : {}),
      };

      logger.info(fields, isAborted ? "requisição interrompida" : "requisição concluída");
    };

    res.once("finish", () => {
      logOnce("completed");
    });
    res.once("close", () => {
      // `close` também segue `finish`; só conta como aborto se a resposta não terminou.
      if (!res.writableEnded) {
        logOnce("aborted");
      }
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
