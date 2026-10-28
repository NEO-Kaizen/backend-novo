import { describe, it } from "node:test";
import { createApp } from "../../src/app.ts";
import { createContainer } from "../../src/container.ts";
import { createOpenApiDocument } from "../../src/docs/openapi.ts";
import { loadConfig } from "../../src/platform/config/load-config.ts";
import { BASE_ENVIRONMENT } from "./harness.ts";
import { assertRouteCoverage } from "./route-coverage.ts";

describe("cobertura do contrato da aplicação", () => {
  it("cobre todas as rotas de negócio com as operações do documento", async () => {
    const container = createContainer(loadConfig(BASE_ENVIRONMENT));

    try {
      const app = createApp(container);

      assertRouteCoverage(app, createOpenApiDocument());
    } finally {
      await container.database.destroy();
    }
  });
});
