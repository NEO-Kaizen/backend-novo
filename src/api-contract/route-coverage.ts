import type { Express } from "express";
import {
  API_BASE_PATH,
  DOCS_UI_PUBLIC_PATH,
  OPENAPI_SPEC_PUBLIC_PATH,
  SCALAR_BUNDLE_PUBLIC_PATH,
} from "../core/http/api-base-path.ts";

/**
 * Cobertura bidirecional entre rotas Express e `openapi.paths`. A guarda falha
 * quando uma rota de negócio não tem operação e quando uma operação não tem
 * rota alcançável no método declarado.
 */

const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

/** Rotas de infraestrutura: não são contrato de domínio (`04-HTTP-Contract.md` §4). */
const EXCLUDED_PATHS: readonly string[] = [
  "/health",
  OPENAPI_SPEC_PUBLIC_PATH,
  DOCS_UI_PUBLIC_PATH,
  SCALAR_BUNDLE_PUBLIC_PATH,
];

const ROUTE_PARAMETER = /:([A-Za-z0-9_]+)/g;
const OPENAPI_PARAMETER = /\{([A-Za-z0-9_]+)\}/g;

interface MatcherResult {
  readonly path: string;
  readonly params: Record<string, string>;
}

type RouteMatcher = (input: string) => MatcherResult | false;

/** Recorte estrutural do Layer do Express 5; `stack` e `matchers` não são públicos. */
interface RouteLayerLike {
  readonly matchers?: readonly RouteMatcher[];
  readonly route?: {
    readonly path: string;
    readonly methods: Readonly<Record<string, boolean>>;
  };
  readonly handle?: { readonly stack?: readonly RouteLayerLike[] };
}

interface CollectedRoute {
  readonly path: string;
  readonly methods: readonly HttpMethod[];
  readonly matcher: RouteMatcher | undefined;
  readonly ancestors: readonly RouteMatcher[];
}

interface DocumentOperation {
  readonly path: string;
  readonly method: HttpMethod;
}

export interface RouteCoverageDocument {
  readonly paths?: Readonly<Record<string, Readonly<Partial<Record<HttpMethod, unknown>>>>>;
}

/** Executa a guarda de cobertura; qualquer divergência lança com rota/operação no texto. */
export function assertRouteCoverage(app: Express, document: RouteCoverageDocument): void {
  const routes = collectRoutes(rootStack(app));
  const operations = collectOperations(document);

  for (const operation of operations) {
    const fullPath = `${API_BASE_PATH}${operation.path}`;

    if (isInfrastructurePath(fullPath)) {
      fail(
        `Operação ${formatMethod(operation.method)} ${operation.path} aponta para rota de infraestrutura, que não tem operação.`,
      );
    }

    const route = routes.find((candidate) => matchesRoute(candidate, fullPath, operation.method));

    if (route === undefined) {
      fail(
        `Operação ${formatMethod(operation.method)} ${operation.path} não tem rota alcançável em ${fullPath}.`,
      );
    }

    if (!parametersMatch(route, operation)) {
      const routeParameters = parameterNames(route.path, ROUTE_PARAMETER);
      const operationParameters = parameterNames(operation.path, OPENAPI_PARAMETER);

      fail(
        `Operação ${formatMethod(operation.method)} ${operation.path} declara parâmetros (${operationParameters.join(", ") || "nenhum"}), mas a rota ${route.path} declara (${routeParameters.join(", ") || "nenhum"}).`,
      );
    }
  }

  for (const route of routes) {
    for (const method of route.methods) {
      if (isDocumented(route, method, operations)) {
        continue;
      }

      if (EXCLUDED_PATHS.some((excluded) => matchesPath(route, excluded))) {
        continue;
      }

      fail(
        `Rota ${formatMethod(method)} ${route.path} não tem operação correspondente em openapi.paths.`,
      );
    }
  }
}

function rootStack(app: Express): readonly RouteLayerLike[] {
  const router = (app as unknown as { router?: { stack?: readonly RouteLayerLike[] } }).router;
  const stack = router?.stack;

  if (stack === undefined) {
    fail("app Express sem router.stack");
  }

  return stack;
}

function collectRoutes(
  stack: readonly RouteLayerLike[],
  ancestors: readonly RouteMatcher[] = [],
): CollectedRoute[] {
  const routes: CollectedRoute[] = [];

  for (const layer of stack) {
    const route = layer.route;

    if (route !== undefined) {
      routes.push({
        path: route.path,
        // `router.all` registra `_all`; expandir força operação para cada método.
        methods:
          route.methods._all === true
            ? HTTP_METHODS
            : HTTP_METHODS.filter((method) => route.methods[method] === true),
        matcher: layer.matchers?.[0],
        ancestors,
      });
      continue;
    }

    const childStack = layer.handle?.stack;
    if (childStack === undefined) {
      continue;
    }

    const matcher = layer.matchers?.[0];
    routes.push(
      ...collectRoutes(childStack, matcher === undefined ? ancestors : [...ancestors, matcher]),
    );
  }

  return routes;
}

function collectOperations(document: RouteCoverageDocument): DocumentOperation[] {
  const operations: DocumentOperation[] = [];

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      if (pathItem[method] !== undefined) {
        operations.push({ path, method });
      }
    }
  }

  return operations;
}

function isDocumented(
  route: CollectedRoute,
  method: HttpMethod,
  operations: readonly DocumentOperation[],
): boolean {
  return operations.some(
    (operation) =>
      operation.method === method &&
      matchesRoute(route, `${API_BASE_PATH}${operation.path}`, method) &&
      parametersMatch(route, operation),
  );
}

/** Uma rota só cobre a operação se declarar os mesmos nomes de parâmetro, na mesma ordem. */
function parametersMatch(route: CollectedRoute, operation: DocumentOperation): boolean {
  return (
    parameterNames(operation.path, OPENAPI_PARAMETER).join(",") ===
    parameterNames(route.path, ROUTE_PARAMETER).join(",")
  );
}

function isInfrastructurePath(fullPath: string): boolean {
  return EXCLUDED_PATHS.includes(fullPath);
}

/**
 * Reproduz o encadeamento de mounts: cada layer ancestral consome um prefixo
 * do caminho candidato e a rota folha precisa consumir o restante. O Express 5
 * não guarda o prefixo no layer, então ele é descoberto pela própria matcher.
 */
function matchesRoute(route: CollectedRoute, fullPath: string, method: HttpMethod): boolean {
  return route.methods.includes(method) && matchesPath(route, fullPath);
}

function matchesPath(route: CollectedRoute, fullPath: string): boolean {
  const remaining = stripMounts(fullPath, route.ancestors);
  if (remaining === null || route.matcher === undefined) {
    return false;
  }

  const match = route.matcher(remaining);
  return match !== false && match.path.length === remaining.length;
}

function stripMounts(fullPath: string, ancestors: readonly RouteMatcher[]): string | null {
  let remaining = fullPath;

  for (const matcher of ancestors) {
    const match = matcher(remaining);
    if (match === false) {
      return null;
    }
    remaining = remaining.slice(match.path.length);
  }

  return remaining === "" ? "/" : remaining;
}

function parameterNames(pattern: string, matcher: RegExp): string[] {
  return [...pattern.matchAll(matcher)].flatMap((match) => {
    const name = match[1];
    return name === undefined ? [] : [name];
  });
}

function formatMethod(method: HttpMethod): string {
  return method.toUpperCase();
}

function fail(message: string): never {
  throw new Error(message);
}
