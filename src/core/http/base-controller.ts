import type { Request, Response, NextFunction } from "express";
import type { Logger } from "../service/logger.ts";
import type { HttpContext } from "./http-context.ts";
import type { Actor } from "../actor.ts";
import type { Page } from "../pagination/page.ts";

export abstract class BaseController {
  protected constructor(protected readonly logger: Logger) {}

  /**
   * Converte req e res do Express em um HttpContext imutável.
   * A partir daqui, o Controller de domínio não toca em req/res.
   */
  protected context(req: Request, res: Response, next?: NextFunction): HttpContext {
    const actor: Actor = (res.locals.actor as Actor) ?? { kind: "anonymous" };
    const requestId = (req.id as string) ?? "unknown-request-id";

    return {
      request: {
        body: req.body,
        params: req.params,
        query: req.query,
        headers: req.headers as Record<string, string | undefined>,
      },
      actor,
      requestId,
      ok: (body: unknown) => {
        res.status(200).json(body);
      },
      created: (body: unknown) => {
        res.status(201).json(body);
      },
      noContent: () => {
        res.status(204).send();
      },
      paginated: (page: Page<unknown>) => {
        res.status(200).json(page);
      },
      fail: (error: unknown) => {
        if (next) {
          next(error);
        } else {
          throw error;
        }
      },
    };
  }
}