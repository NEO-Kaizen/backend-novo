import type { Express } from "express";
import { createApp } from "../../src/app.ts";
import type { Container } from "../../src/container.ts";

/**
 * Ponto de montagem do app nos testes: a mesma `createApp` que `server.ts`
 * usa, mas alimentado pelo `TestContainer`. `supertest(app)` sobe servidor
 * efêmero por requisição e o fecha — nenhum teste fixa porta com `listen`.
 */
export function createTestApp(container: Container): Express {
  return createApp(container);
}
