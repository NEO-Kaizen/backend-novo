import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { API_BASE_PATH } from "../../src/core/http/api-base-path.ts";
import { startTestServer } from "./harness.ts";

describe("exposição da documentação HTTP", () => {
  it("retorna 404 em produção sem DOCS_ENABLED", async () => {
    const server = await startTestServer({ NODE_ENV: "production" });

    try {
      const spec = await fetch(`${server.baseUrl}${API_BASE_PATH}/openapi.json`);
      const ui = await fetch(`${server.baseUrl}${API_BASE_PATH}/docs`);

      assert.equal(spec.status, 404);
      assert.equal(ui.status, 404);
      assert.equal(((await spec.json()) as { code?: string }).code, "not_found");
      assert.equal(((await ui.json()) as { code?: string }).code, "not_found");
    } finally {
      await server.close();
    }
  });

  it("serve o spec e a UI em produção com DOCS_ENABLED=true", async () => {
    const server = await startTestServer({ NODE_ENV: "production", DOCS_ENABLED: "true" });

    try {
      const spec = await fetch(`${server.baseUrl}${API_BASE_PATH}/openapi.json`);
      const ui = await fetch(`${server.baseUrl}${API_BASE_PATH}/docs`);

      assert.equal(spec.status, 200);
      assert.equal(((await spec.json()) as { openapi?: string }).openapi, "3.1.0");
      assert.equal(ui.status, 200);
      assert.match(await ui.text(), new RegExp(`${API_BASE_PATH}/openapi\\.json`));
    } finally {
      await server.close();
    }
  });

  it("serve a UI com o bundle local do Scalar, sem CDN", async () => {
    const server = await startTestServer({ NODE_ENV: "production", DOCS_ENABLED: "true" });

    try {
      const ui = await fetch(`${server.baseUrl}${API_BASE_PATH}/docs`);
      const html = await ui.text();

      assert.equal(ui.status, 200);
      assert.match(html, /\/api\/v1\/docs\/assets\/standalone\.js/);
      assert.doesNotMatch(html, /jsdelivr/i);

      const asset = await fetch(`${server.baseUrl}${API_BASE_PATH}/docs/assets/standalone.js`, {
        method: "HEAD",
      });

      assert.equal(asset.status, 200);
      assert.match(asset.headers.get("content-type") ?? "", /javascript/);
    } finally {
      await server.close();
    }
  });

  it("serve o spec e a UI por padrão no ambiente de teste", async () => {
    const server = await startTestServer();

    try {
      const spec = await fetch(`${server.baseUrl}${API_BASE_PATH}/openapi.json`);
      const ui = await fetch(`${server.baseUrl}${API_BASE_PATH}/docs`);

      assert.equal(spec.status, 200);
      assert.equal(ui.status, 200);
    } finally {
      await server.close();
    }
  });

  it("retorna 404 em desenvolvimento com DOCS_ENABLED=false", async () => {
    const server = await startTestServer({ NODE_ENV: "development", DOCS_ENABLED: "false" });

    try {
      const spec = await fetch(`${server.baseUrl}${API_BASE_PATH}/openapi.json`);
      const ui = await fetch(`${server.baseUrl}${API_BASE_PATH}/docs`);

      assert.equal(spec.status, 404);
      assert.equal(ui.status, 404);
      assert.equal(((await spec.json()) as { code?: string }).code, "not_found");
      assert.equal(((await ui.json()) as { code?: string }).code, "not_found");
    } finally {
      await server.close();
    }
  });
});
