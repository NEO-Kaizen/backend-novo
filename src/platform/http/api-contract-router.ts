import { apiReference } from "@scalar/express-api-reference";
import { Router } from "express";
import { API_BASE_PATH } from "../../core/http/api-base-path.ts";

/** Visão mínima do documento gerado que o router precisa para servir e titular a UI. */
export interface ApiContractDocument {
  readonly info: { readonly title: string };
}

/**
 * Servidor do contrato e da documentação: o spec e a UI consomem o documento
 * pronto. O router recebe o documento do container e não importa
 * `src/api-contract`.
 */
export function createApiContractRouter(document: ApiContractDocument): Router {
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
