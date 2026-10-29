import type { Express } from "express";

/**
 * Fronteira documentada com os internals do Express 5 (`CODING_STANDARDS.md` §3).
 *
 * O Express 5 tipa `app.router`, mas `layer.matchers`, `layer.handle.stack` e
 * `route.methods._all` não fazem parte do contrato público. Este é o único
 * módulo que lê esses campos; a guarda de cobertura (`route-coverage.ts`)
 * consome apenas os acessores abaixo. Se um patch do Express mudar o layout,
 * a falha fica concentrada aqui.
 */

export interface MatcherResult {
  readonly path: string;
}

export type RouteMatcher = (input: string) => MatcherResult | false;

export interface RouteRecord {
  readonly path: string;
  readonly methods: Readonly<Record<string, boolean>>;
}

export interface RouteLayer {
  readonly matchers?: readonly RouteMatcher[];
  readonly route?: RouteRecord;
  readonly handle?: { readonly stack?: readonly RouteLayer[] };
}

/** O layout de `router.stack` não é contrato público; a asserção fica confinada a esta fronteira. */
export function readRootStack(app: Express): readonly RouteLayer[] {
  const stack = app.router?.stack as unknown as readonly RouteLayer[] | undefined;

  if (stack === undefined) {
    throw new Error("app Express sem router.stack");
  }

  return stack;
}

export function readRoute(layer: RouteLayer): RouteRecord | undefined {
  return layer.route;
}

/** `router.all` registra `_all`; a guarda expande para todos os métodos. */
export function declaresAllMethods(route: RouteRecord): boolean {
  return route.methods._all === true;
}

export function declaresMethod(route: RouteRecord, method: string): boolean {
  return route.methods[method] === true;
}

export function readFirstMatcher(layer: RouteLayer): RouteMatcher | undefined {
  return layer.matchers?.[0];
}

export function readChildStack(layer: RouteLayer): readonly RouteLayer[] | undefined {
  return layer.handle?.stack;
}
