import { createRequire } from "node:module";
import path from "node:path";
import { apiReference } from "@scalar/express-api-reference";
import { Router } from "express";
import { API_BASE_PATH } from "../../core/http/api-base-path.ts";

/** Visão mínima do documento gerado que o router precisa para servir e titular a UI. */
export interface ApiContractMetadata {
  readonly info: { readonly title: string };
}

/** Rota do bundle UMD do Scalar; o arquivo vem do pacote instalado, nunca de CDN. */
const SCALAR_BUNDLE_ROUTE = "/docs/assets/standalone.js";

/**
 * Caminho absoluto do UMD do Scalar. `@scalar/api-reference` resolve para o
 * entry `dist/index.js`; o bundle `dist/browser/standalone.js` fica ao lado.
 */
const SCALAR_BUNDLE_PATH = path.join(
  path.dirname(createRequire(import.meta.url).resolve("@scalar/api-reference")),
  "browser/standalone.js",
);

/**
 * Servidor do contrato e da documentação: o spec e a UI consomem o documento
 * pronto. O router recebe o documento do container e não importa
 * `src/api-contract`.
 */
export function createApiContractRouter(document: ApiContractMetadata): Router {
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res.status(200).json(document);
  });

  // Assets locais da UI: o HTML aponta para cá, então nenhum CDN participa do runtime.
  router.get(SCALAR_BUNDLE_ROUTE, (_req, res) => {
    res.sendFile(SCALAR_BUNDLE_PATH, { maxAge: "1h" });
  });

  router.use(
    "/docs",
    apiReference({
      url: `${API_BASE_PATH}/openapi.json`,
      pageTitle: document.info.title,
      cdn: `${API_BASE_PATH}${SCALAR_BUNDLE_ROUTE}`,
      bundle: false,
    }),
  );

  return router;
}
