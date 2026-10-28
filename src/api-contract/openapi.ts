import { createDocument } from "zod-openapi";
import { API_BASE_PATH } from "../core/http/api-base-path.ts";
import { components } from "./components.ts";

/**
 * Compõe o documento OpenAPI. `paths` é o ponto de composição das operações
 * vindas dos `*.openapi.ts` de domínio; até o primeiro domínio publicar, fica
 * vazio e o artefato contém só os componentes compartilhados.
 */
export function createOpenApiDocument(): ReturnType<typeof createDocument> {
  return createDocument({
    openapi: "3.1.0",
    info: {
      title: "MAAT Backend API",
      version: "0.0.0",
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
