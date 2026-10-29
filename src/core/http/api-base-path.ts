/** Sonda de infraestrutura, fora do contrato versionado. */
export const HEALTH_PATH = "/health";

/**
 * Base path único da API versionada (`docs/04-API-Conventions.md` §1). O
 * contrato, o router de docs e a cobertura de rotas leem daqui para não haver
 * uma segunda cópia do prefixo.
 */
export const API_BASE_PATH = "/api/v1";

/** Rotas do contrato, relativas ao mount em `API_BASE_PATH`. */
export const OPENAPI_SPEC_ROUTE = "/openapi.json";
export const DOCS_UI_ROUTE = "/docs";
export const SCALAR_BUNDLE_ROUTE = `${DOCS_UI_ROUTE}/assets/standalone.js`;

/** Caminhos públicos: o que a UI referencia e a guarda exclui da cobertura. */
export const OPENAPI_SPEC_PUBLIC_PATH = `${API_BASE_PATH}${OPENAPI_SPEC_ROUTE}`;
export const DOCS_UI_PUBLIC_PATH = `${API_BASE_PATH}${DOCS_UI_ROUTE}`;
export const SCALAR_BUNDLE_PUBLIC_PATH = `${API_BASE_PATH}${SCALAR_BUNDLE_ROUTE}`;
