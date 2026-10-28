import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { API_BASE_PATH } from "../../src/core/http/api-base-path.ts";
import { assertRouteCoverage } from "./route-coverage.ts";

describe("cobertura de rotas do contrato", () => {
  it("falha quando uma rota de negócio não tem operação", () => {
    const app = express();
    const router = express.Router();
    router.get("/probe", (_req, res) => {
      res.sendStatus(204);
    });
    app.use(API_BASE_PATH, router);

    assert.throws(() => assertRouteCoverage(app, { paths: {} }), /GET \/probe/);
  });

  it("falha quando uma operação não tem rota alcançável", () => {
    const app = express();

    assert.throws(
      () => assertRouteCoverage(app, { paths: { "/probe": { get: {} } } }),
      /Operação GET \/probe não tem rota alcançável em \/api\/v1\/probe/,
    );
  });

  it("ignora a sonda /health", () => {
    const app = express();
    app.get("/health", (_req, res) => {
      res.sendStatus(200);
    });

    assert.doesNotThrow(() => assertRouteCoverage(app, { paths: {} }));
  });

  it("passa quando rota e operação coincidem, inclusive nos parâmetros", () => {
    const app = express();
    const router = express.Router();
    router.get("/probe/:id", (_req, res) => {
      res.sendStatus(200);
    });
    app.use(API_BASE_PATH, router);

    assert.doesNotThrow(() => assertRouteCoverage(app, { paths: { "/probe/{id}": { get: {} } } }));
  });
});
