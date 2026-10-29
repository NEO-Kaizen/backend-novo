import supertest from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Express } from "express";
import { createTestApp } from "../support/app.ts";
import { createTestContainer } from "../support/container.ts";
import type { TestContainer } from "../support/container.ts";
import { FIRST_SEQUENTIAL_ID } from "../support/fakes/sequential-id-generator.ts";

// Deps recriadas no `beforeEach` e destruídas no `afterEach`: nenhum teste
// compartilha container, app ou estado (CODING_STANDARDS.md §10).
let container: TestContainer;
let app: Express;

beforeEach(() => {
  container = createTestContainer();
  app = createTestApp(container);
});

afterEach(async () => {
  await container.database.destroy();
});

describe("GET /health", () => {
  it("responde 200 com o corpo da sonda, fora do prefixo versionado", async () => {
    const response = await supertest(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("retorna uuid v4 sequencial no header x-request-id", async () => {
    const response = await supertest(app).get("/health");

    expect(response.headers["x-request-id"]).toBe(FIRST_SEQUENTIAL_ID);
  });

  it("ecoa o x-request-id enviado quando ele é um uuid válido", async () => {
    const requestId = "123e4567-e89b-42d3-a456-426614174000";

    const response = await supertest(app).get("/health").set("x-request-id", requestId);

    expect(response.headers["x-request-id"]).toBe(requestId);
  });
});

describe("Rota desconhecida", () => {
  it("responde 404 no envelope de erro com code e requestId aditivos", async () => {
    const response = await supertest(app).get("/rota-inexistente");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: "error",
      statusCode: 404,
      message: "Recurso não encontrado.",
      code: "not_found",
      requestId: FIRST_SEQUENTIAL_ID,
    });
  });

  it("registra a recusa no logger como 4xx, sem corpo crus", async () => {
    await supertest(app).get("/rota-inexistente");

    const warnEntries = container.logger.entries("warn");
    expect(warnEntries).toHaveLength(1);
    expect(warnEntries[0]?.fields).toMatchObject({
      code: "not_found",
      correlationId: FIRST_SEQUENTIAL_ID,
    });
  });

  it("substitui x-request-id inválido por um uuid gerado", async () => {
    const response = await supertest(app)
      .get("/rota-inexistente")
      .set("x-request-id", "não-é-uuid");

    expect(response.headers["x-request-id"]).toBe(FIRST_SEQUENTIAL_ID);
  });
});
