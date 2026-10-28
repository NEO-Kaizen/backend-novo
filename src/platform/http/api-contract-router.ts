import { existsSync } from "node:fs";
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
 * Servidor do contrato e da documentação: o spec e a UI consomem o documento
 * pronto. O router recebe o documento do container e não importa
 * `src/api-contract`.
 */
export function createApiContractRouter(document: ApiContractMetadata): Router {
  const router = Router();
  const bundlePath = resolveScalarBundle();

  router.get("/openapi.json", (_req, res) => {
    res.status(200).json(document);
  });

  // Assets locais da UI: o HTML aponta para cá, então nenhum CDN participa do runtime.
  router.get(SCALAR_BUNDLE_ROUTE, (_req, res) => {
    res.sendFile(bundlePath, { maxAge: "1h" });
  });

  router.use(
    "/docs",
    apiReference({
      url: `${API_BASE_PATH}/openapi.json`,
      pageTitle: document.info.title,
      cdn: `${API_BASE_PATH}${SCALAR_BUNDLE_ROUTE}`,
    }),
  );

  return router;
}

/**
 * Caminho absoluto do UMD do Scalar. A resolução fica dentro da fábrica, então
 * um processo com docs desligados não depende do pacote. O pin exato em
 * `package.json` é o que sustenta o layout `dist/browser/standalone.js`; se ele
 * mudar, o boot falha com o caminho no texto em vez de servir 404 em runtime.
 */
function resolveScalarBundle(): string {
  const entry = createRequire(import.meta.url).resolve("@scalar/api-reference");
  const bundlePath = path.join(path.dirname(entry), "browser/standalone.js");

  if (!existsSync(bundlePath)) {
    throw new Error(
      `Bundle do Scalar não encontrado em ${bundlePath}; a versão instalada de @scalar/api-reference não segue o layout esperado.`,
    );
  }

  return bundlePath;
}
