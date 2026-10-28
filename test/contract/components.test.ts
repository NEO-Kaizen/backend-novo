import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { API_BASE_PATH } from "../../src/core/http/api-base-path.ts";
import { EXPOSED_ERROR_CODES } from "../../src/core/errors/error-codes.ts";
import { createOpenApiDocument } from "../../src/api-contract/openapi.ts";

interface SchemaLike {
  type?: string;
  format?: string;
  const?: unknown;
  enum?: readonly string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  properties?: Record<string, SchemaLike>;
  required?: readonly string[];
}

interface ParameterLike {
  name?: string;
  in?: string;
  required?: boolean;
  deprecated?: boolean;
  example?: unknown;
  schema?: SchemaLike;
}

interface SecuritySchemeLike {
  type?: string;
  in?: string;
  name?: string;
  description?: string;
}

interface DocumentLike {
  openapi?: string;
  servers?: readonly { url?: string }[];
  security?: readonly Record<string, readonly string[]>[];
  components?: {
    schemas?: Record<string, SchemaLike>;
    parameters?: Record<string, ParameterLike>;
    securitySchemes?: Record<string, SecuritySchemeLike>;
  };
}

// O documento gerado tem a tipagem do zod-openapi; o teste o inspeciona por uma
// visão estrutural mínima para não acoplar os asserts à tipagem da biblioteca.
const document = createOpenApiDocument() as unknown as DocumentLike;

const REQUIRED_SCHEMAS = [
  "ErrorEnvelope",
  "ValidationError",
  "LegacyValidationError",
  "ConflictError",
  "PaginatedResponse",
  "ErrorCode",
  "FieldError",
];

const REQUIRED_PARAMETERS = ["PageSize", "RequesterEmail", "RequesterIdentity"];

describe("componentes do OpenAPI", () => {
  it("publica a versão 3.1.0 e o base path como servidor", () => {
    assert.equal(document.openapi, "3.1.0");
    assert.equal(document.servers?.[0]?.url, API_BASE_PATH);
  });

  it("declara a segurança global pelo cookie de sessão", () => {
    assert.deepEqual(document.security, [{ sessionCookie: [] }]);
    assert.deepEqual(document.components?.securitySchemes?.sessionCookie, {
      type: "apiKey",
      in: "cookie",
      name: "session_id",
      description: "Sessão JWT em cookie HttpOnly; nome default session_id.",
    });
  });

  it("inclui todos os schemas compartilhados", () => {
    for (const name of REQUIRED_SCHEMAS) {
      assert.ok(document.components?.schemas?.[name] !== undefined, `schema ausente: ${name}`);
    }
  });

  it("inclui todos os parâmetros compartilhados", () => {
    for (const name of REQUIRED_PARAMETERS) {
      assert.ok(
        document.components?.parameters?.[name] !== undefined,
        `parâmetro ausente: ${name}`,
      );
    }
  });

  it("gera ErrorCode a partir do catálogo exposto, mais os códigos legados", () => {
    const codes = document.components?.schemas?.ErrorCode?.enum ?? [];

    for (const code of EXPOSED_ERROR_CODES) {
      assert.ok(codes.includes(code), `código exposto ausente: ${code}`);
    }
    assert.ok(codes.includes("not_the_assignee"));
    assert.ok(codes.includes("invalid_status_transition"));
  });

  it("declara PageSize com default 20 e máximo 100 na query", () => {
    const pageSize = document.components?.parameters?.PageSize;

    assert.equal(pageSize?.in, "query");
    assert.equal(pageSize?.name, "pageSize");
    assert.equal(pageSize?.schema?.default, 20);
    assert.equal(pageSize?.schema?.minimum, 1);
    assert.equal(pageSize?.schema?.maximum, 100);
    assert.equal(pageSize?.example, 20);
  });

  it("declara os headers do solicitante como opcionais e o legado como deprecated", () => {
    const email = document.components?.parameters?.RequesterEmail;
    const identity = document.components?.parameters?.RequesterIdentity;

    assert.equal(email?.in, "header");
    assert.equal(email?.name, "X-Requester-Email");
    assert.equal(email?.required, false);
    assert.equal(email?.schema?.format, "email");

    assert.equal(identity?.in, "header");
    assert.equal(identity?.name, "X-Requester-Identity");
    assert.equal(identity?.required, false);
    assert.equal(identity?.deprecated, true);
  });

  it("documenta o envelope base sem os aditivos como campos obrigatórios", () => {
    const envelope = document.components?.schemas?.ErrorEnvelope;

    assert.deepEqual([...(envelope?.required ?? [])].sort(), ["message", "status", "statusCode"]);
    assert.deepEqual(envelope?.properties?.status, { type: "string", const: "error" });
  });

  it("modela as variantes de erro com status e campos do contrato", () => {
    const validation = document.components?.schemas?.ValidationError;
    const legacy = document.components?.schemas?.LegacyValidationError;
    const conflict = document.components?.schemas?.ConflictError;

    assert.equal(validation?.properties?.statusCode?.const, 400);
    assert.equal(validation?.properties?.code?.const, "validation_error");
    assert.equal(validation?.properties?.fields?.type, "array");

    assert.equal(legacy?.properties?.statusCode?.const, 422);
    assert.equal(legacy?.properties?.fields?.type, "object");

    assert.equal(conflict?.properties?.statusCode?.const, 409);
    assert.equal(conflict?.properties?.code?.const, "conflict");
    assert.deepEqual([...(conflict?.required ?? [])].sort(), [
      "code",
      "currentStatusKey",
      "message",
      "status",
      "statusCode",
    ]);
  });

  it("modela o envelope de paginação com os campos obrigatórios", () => {
    const paginated = document.components?.schemas?.PaginatedResponse;

    assert.deepEqual([...(paginated?.required ?? [])].sort(), [
      "data",
      "page",
      "pageSize",
      "total",
      "totalPages",
    ]);
    assert.equal(paginated?.properties?.data?.type, "array");
    assert.equal(paginated?.properties?.pageSize?.maximum, 100);
  });
});
