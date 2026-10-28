import { apiReference } from "@scalar/express-api-reference";
import { Router } from "express";
import { API_BASE_PATH } from "../../core/http/api-base-path.ts";

/** Visão mínima do documento gerado que o router precisa para servir e titular a UI. */
export interface DocsDocument {
  readonly info: { readonly title: string };
}

/**
 * Servidor da documentação: o spec e a UI consomem o documento pronto. O
 * router recebe o documento do container e não importa `src/docs`.
 */
export function createDocsRouter(document: DocsDocument): Router {
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res.status(200).json(document);
  });

  router.use(
    "/docs",
    apiReference({
      url: `${API_BASE_PATH}/openapi.json`,
      pageTitle: document.info.title,
    }),
  );

  return router;
}
