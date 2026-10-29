import type { Express } from "express";
import {
  API_BASE_PATH,
  DOCS_UI_PUBLIC_PATH,
  HEALTH_PATH,
  OPENAPI_SPEC_PUBLIC_PATH,
  SCALAR_BUNDLE_PUBLIC_PATH,
} from "../core/http/api-base-path.ts";
import {
  declaresAllMethods,
  declaresMethod,
  readChildStack,
  readFirstMatcher,
  readRootStack,
  readRoute,
  type RouteLayer,
  type RouteMatcher,
} from "./express-route-stack.ts";

/**
 * Cobertura bidirecional entre rotas Express e `openapi.paths`. A guarda falha
 * quando uma rota de negócio não tem operação e quando uma operação não tem
 * rota alcançável no método declarado.
 */

const HTTP_METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

/** Rota de infraestrutura: não é contrato de domínio (`04-HTTP-Contract.md` §4). */
interface InfrastructureRoute {
  readonly name: string;
  readonly path: string;
}

const INFRASTRUCTURE_ROUTES: readonly InfrastructureRoute[] = [
  { name: "health", path: HEALTH_PATH },
  { name: "openapi", path: OPENAPI_SPEC_PUBLIC_PATH },
  { name: "docs", path: DOCS_UI_PUBLIC_PATH },
  { name: "bundle do Scalar", path: SCALAR_BUNDLE_PUBLIC_PATH },
];

const ROUTE_PARAMETER = /:([A-Za-z0-9_]+)/g;
const OPENAPI_PARAMETER = /\{([A-Za-z0-9_]+)\}/g;

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

type DocumentPaths = Readonly<Record<string, Readonly<Partial<Record<HttpMethod, unknown>>>>>;

/** Executa a guarda de cobertura; qualquer divergência lança com rota/operação no texto. */
export function assertRouteCoverage(
  app: Express,
  document: { readonly paths?: DocumentPaths },
): void {
  const routes = collectRoutes(readRootStack(app));
  const operations = collectOperations(document);

  for (const operation of operations) {
    const fullPath = `${API_BASE_PATH}${operation.path}`;

    const infrastructureRoute = findInfrastructureRoute(fullPath);

    if (infrastructureRoute !== undefined) {
      fail(
        `Operação ${formatMethod(operation.method)} ${operation.path} aponta para a rota de infraestrutura ${infrastructureRoute.name}, que não tem operação.`,
      );
    }

    const route = routes.find((candidate) => matchesRoute(candidate, fullPath, operation.method));

    if (route === undefined) {
      fail(
        `Operação ${formatMethod(operation.method)} ${operation.path} não tem rota alcançável em ${fullPath}.`,
      );
    }

    if (!parametersMatch(route, operation)) {
      const routeParameters = collectParameterNames(route.path, ROUTE_PARAMETER);
      const operationParameters = collectParameterNames(operation.path, OPENAPI_PARAMETER);

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

      if (INFRASTRUCTURE_ROUTES.some((excluded) => matchesPath(route, excluded.path))) {
        continue;
      }

      fail(
        `Rota ${formatMethod(method)} ${route.path} não tem operação correspondente em openapi.paths.`,
      );
    }
  }
}

function collectRoutes(
  stack: readonly RouteLayer[],
  ancestors: readonly RouteMatcher[] = [],
): CollectedRoute[] {
  const routes: CollectedRoute[] = [];

  for (const layer of stack) {
    const route = readRoute(layer);

    if (route !== undefined) {
      routes.push({
        path: route.path,
        methods: declaresAllMethods(route)
          ? HTTP_METHODS
          : HTTP_METHODS.filter((method) => declaresMethod(route, method)),
        matcher: readFirstMatcher(layer),
        ancestors,
      });
      continue;
    }

    const childStack = readChildStack(layer);
    if (childStack === undefined) {
      continue;
    }

    const matcher = readFirstMatcher(layer);
    routes.push(
      ...collectRoutes(childStack, matcher === undefined ? ancestors : [...ancestors, matcher]),
    );
  }

  return routes;
}

function collectOperations(document: { readonly paths?: DocumentPaths }): DocumentOperation[] {
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
    collectParameterNames(operation.path, OPENAPI_PARAMETER).join(",") ===
    collectParameterNames(route.path, ROUTE_PARAMETER).join(",")
  );
}

function findInfrastructureRoute(fullPath: string): InfrastructureRoute | undefined {
  return INFRASTRUCTURE_ROUTES.find((route) => route.path === fullPath);
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

function collectParameterNames(pattern: string, matcher: RegExp): string[] {
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
