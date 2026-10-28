/**
 * Base path único da API versionada (`docs/04-API-Conventions.md` §1). O
 * contrato, o router de docs e a cobertura de rotas leem daqui para não haver
 * uma segunda cópia do prefixo.
 */
export const API_BASE_PATH = "/api/v1";

/** Rota do bundle UMD do Scalar, relativa ao mount do contrato (`/api/v1`). */
export const SCALAR_BUNDLE_ROUTE = "/docs/assets/standalone.js";

/** Caminho público do bundle: o que a UI referencia e a guarda exclui da cobertura. */
export const SCALAR_BUNDLE_PUBLIC_PATH = `${API_BASE_PATH}${SCALAR_BUNDLE_ROUTE}`;
