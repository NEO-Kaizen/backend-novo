import { apiReference } from "@scalar/express-api-reference";
import { Router } from "express";
import { API_BASE_PATH } from "../../core/http/api-base-path.ts";

/**
 * Servidor da documentação: o spec e a UI consomem o documento pronto. O
 * router recebe o documento do container e não importa `src/docs`.
 */
export function createDocsRouter(document: object): Router {
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res.json(document);
  });

  router.use(
    "/docs",
    apiReference({
      url: `${API_BASE_PATH}/openapi.json`,
      pageTitle: "MAAT Backend API",
    }),
  );

  return router;
}
