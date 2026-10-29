import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { apiReference } from "@scalar/express-api-reference";
import { Router } from "express";
import {
  DOCS_UI_ROUTE,
  OPENAPI_SPEC_PUBLIC_PATH,
  OPENAPI_SPEC_ROUTE,
  SCALAR_BUNDLE_PUBLIC_PATH,
  SCALAR_BUNDLE_ROUTE,
} from "../../core/http/api-base-path.ts";

/**
 * Servidor do contrato e da documentação: o spec e a UI consomem o documento
 * pronto. O router recebe o documento do container e não importa
 * `src/api-contract`.
 */
export function createApiContractRouter(document: {
  readonly info: { readonly title: string };
}): Router {
  const router = Router();
  const bundlePath = resolveScalarBundle();

  router.get(OPENAPI_SPEC_ROUTE, (_req, res) => {
    res.status(200).json(document);
  });

  // Assets locais da UI: o HTML aponta para cá, então nenhum CDN participa do runtime.
  router.get(SCALAR_BUNDLE_ROUTE, (_req, res) => {
    res.sendFile(bundlePath, { maxAge: "1h" });
  });

  router.use(
    DOCS_UI_ROUTE,
    apiReference({
      url: OPENAPI_SPEC_PUBLIC_PATH,
      pageTitle: document.info.title,
      cdn: SCALAR_BUNDLE_PUBLIC_PATH,
    }),
  );

  return router;
}

/**
 * Caminho absoluto do UMD do Scalar. A resolução fica dentro da fábrica, então
 * um processo com docs desligados não resolve nem exige o bundle; o pacote
 * `@scalar/express-api-reference` continua sendo uma dependência de runtime. O
 * pin exato em `package.json` é o que sustenta o layout `dist/browser/standalone.js`;
 * se ele mudar, o boot falha com o caminho no texto em vez de servir 404 em runtime.
 */
function resolveScalarBundle(): string {
  const entry = fileURLToPath(import.meta.resolve("@scalar/api-reference"));
  const bundlePath = join(dirname(entry), "browser/standalone.js");

  if (!existsSync(bundlePath)) {
    throw new Error(
      `Bundle do Scalar não encontrado em ${bundlePath}; a versão instalada de @scalar/api-reference não segue o layout esperado.`,
    );
  }

  return bundlePath;
}
