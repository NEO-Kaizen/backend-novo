import { createDocument } from "zod-openapi";
import { API_BASE_PATH } from "../core/http/api-base-path.ts";
import { components } from "./components.ts";

/**
 * Versão do contrato publicado, não a do `package.json`
 * (`docs/04-HTTP-Contract.md` §11).
 */
export const CONTRACT_VERSION = "0.0.0";

/**
 * Versão do contrato. Fonte única para o gerador e para a guarda, que recusa um
 * spec servido em versão diferente da decidida no ADR-0026.
 */
export const OPENAPI_VERSION = "3.1.0";

/**
 * Compõe o documento OpenAPI. `paths` é o ponto de composição das operações
 * vindas dos `*.openapi.ts` de domínio; até o primeiro domínio publicar, fica
 * vazio e o artefato contém só os componentes compartilhados.
 */
export function createOpenApiDocument(): ReturnType<typeof createDocument> {
  return createDocument({
    openapi: OPENAPI_VERSION,
    info: {
      title: "MAAT Backend API",
      version: CONTRACT_VERSION,
      description:
        "Contrato HTTP do backend-novo. As operações serão geradas a partir dos schemas Zod.",
    },
    servers: [
      {
        url: API_BASE_PATH,
        description: "Base path da API; a origem é definida pelo ambiente.",
      },
    ],
    security: [{ sessionCookie: [] }],
    components,
    paths: {},
  });
}
