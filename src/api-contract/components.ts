import { z } from "zod";
import type { ZodOpenApiComponentsObject } from "zod-openapi";
import { EXPOSED_ERROR_CODES } from "../core/errors/error-codes.ts";

/**
 * Componentes compartilhados do OpenAPI. O artefato `openapi/openapi.json` é
 * gerado a partir daqui: `openapi.ts` compõe as rotas e `generate-openapi.ts`
 * escreve o JSON.
 */

// `not_the_assignee` e `invalid_status_transition` vêm do porte legado e estão
// hardcoded aqui porque os domínios que os emitem ainda não foram implementados.
// Cada um migra para `core/errors/error-codes.ts` junto com seu domínio, quando
// então esta lista passa a ser montada só do catálogo exposto.
export const ErrorCode = z
  .enum([...EXPOSED_ERROR_CODES, "not_the_assignee", "invalid_status_transition"])
  .meta({
    id: "ErrorCode",
    description:
      "Código estável em snake_case. Será gerado de core/errors/error-codes.ts; os códigos de core/errors/internal-codes.ts nunca são expostos.",
    example: "not_found",
  });

/**
 * O esqueleto manual não declarava `additionalProperties`; no JSON Schema isso
 * mantém o objeto aberto. O zod-openapi fecha objetos por default, então o
 * override preserva a política de aditivos de `04-HTTP-Contract.md` §6/§7.
 */
const additivePolicy = { override: { additionalProperties: true } } as const;

export const FieldError = z
  .object({
    path: z.string().describe("Caminho do campo, por exemplo demand.title."),
    message: z.string().describe("Mensagem pt-BR do campo."),
  })
  .meta({
    id: "FieldError",
    // Sem `outputId`, o zod-openapi 6.0.2 deriva `FieldErrorOutput` quando o
    // schema é usado em resposta; o contrato tem um único `FieldError`.
    outputId: "FieldError",
    description: "Erro de validação de um campo.",
    example: {
      path: "demand.title",
      message: "Informe o título.",
    },
  });

/** Status fixo de uma variante de erro; `override` mantém `type: integer` e `const` no JSON. */
const statusCode = (status: number) =>
  z.literal(status).meta({ override: { type: "integer", const: status } });

export const ErrorEnvelope = z
  .object({
    status: z.literal("error"),
    statusCode: z.int(),
    message: z.string(),
    code: ErrorCode.optional(),
    requestId: z.uuid().optional().describe("Correlation id HTTP (aditivo)."),
  })
  .meta({
    id: "ErrorEnvelope",
    ...additivePolicy,
    description: "Envelope de erro vigente (legado, ADR-0005).",
    example: {
      status: "error",
      statusCode: 404,
      message: "Solicitação não encontrada.",
      code: "not_found",
      requestId: "00000000-0000-4000-8000-000000000000",
    },
  });

export const ValidationError = ErrorEnvelope.extend({
  statusCode: statusCode(400),
  code: z.literal("validation_error"),
  fields: z.array(FieldError),
}).meta({
  id: "ValidationError",
  ...additivePolicy,
  description:
    "Envelope do 400 de validação unificado (transitório, migração C2): fields é um array.",
  example: {
    status: "error",
    statusCode: 400,
    message: "Dados inválidos.",
    code: "validation_error",
    fields: [
      {
        path: "demand.title",
        message: "Informe o título.",
      },
    ],
  },
});

export const LegacyValidationError = ErrorEnvelope.extend({
  statusCode: statusCode(422),
  fields: z.record(z.string(), z.string()),
}).meta({
  id: "LegacyValidationError",
  ...additivePolicy,
  description:
    "Corpo 422 vigente do fluxo de requests durante a migração C2: fields é um objeto indexado pelo caminho do campo. Será removido quando o 400 unificado entrar.",
  example: {
    status: "error",
    statusCode: 422,
    message: "Dados inválidos.",
    fields: {
      "demand.title": "Informe o título.",
    },
  },
});

export const ConflictError = ErrorEnvelope.extend({
  statusCode: statusCode(409),
  code: z.literal("conflict"),
  currentStatusKey: z.string().describe("Key do status atual (§8.1 de 04-API-Conventions.md)."),
  currentStatusId: z.uuid().optional().describe("UUID do status atual (fallback de migração)."),
}).meta({
  id: "ConflictError",
  ...additivePolicy,
  description:
    "Envelope do 409 de concorrência: estende ErrorEnvelope com a key do status atual e, opcionalmente, o UUID de fallback.",
  example: {
    status: "error",
    statusCode: 409,
    message: "O status foi alterado por outra pessoa.",
    code: "conflict",
    currentStatusKey: "in_progress",
  },
});

export const PaginatedResponse = z
  .object({
    data: z.array(z.unknown()),
    page: z
      .int()
      .min(1)
      .describe(
        "Página efetiva (1-based). Acima de `totalPages`, é ajustada para `totalPages`; com `total` 0, volta 1 (§4.2).",
      ),
    pageSize: z
      .int()
      .min(1)
      .max(100)
      .describe(
        "Tamanho efetivo da página. Sem default próprio: o default 20 e o máximo 100 são do parâmetro de request `PageSize`; acima do máximo a request recebe 400 validation_error (§4.2).",
      ),
    total: z.int().min(0),
    totalPages: z.int().min(0),
  })
  .meta({
    id: "PaginatedResponse",
    ...additivePolicy,
    description: "Envelope de paginação padrão.",
    example: {
      data: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    },
  });

export const PageSize = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20)
  .meta({
    param: {
      id: "PageSize",
      in: "query",
      name: "pageSize",
      description: "Default 20; máximo 100. Acima do máximo a API responde 400 validation_error.",
      // `example` fica no nível do parâmetro, como no artefato; o schema não
      // declara exemplo próprio.
      example: 20,
    },
  });

export const RequesterEmail = z
  .email()
  .optional()
  .meta({
    param: {
      id: "RequesterEmail",
      in: "header",
      name: "X-Requester-Email",
      required: false,
      description:
        "E-mail do solicitante na janela de compatibilidade; não autentica. Ver `04-API-Conventions.md` §15.3 e ADR-0023.",
      example: "requester@example.com",
    },
  });

export const RequesterIdentity = z
  .string()
  .optional()
  .meta({
    param: {
      id: "RequesterIdentity",
      in: "header",
      name: "X-Requester-Identity",
      required: false,
      deprecated: true,
      description:
        "Identidade legada aceita por uma release; será removida quando a janela de compatibilidade fechar (ADR-0023).",
      example: "legacy-requester",
    },
  });

export const securitySchemes = {
  sessionCookie: {
    type: "apiKey",
    in: "cookie",
    name: "session_id",
    description: "Sessão JWT em cookie HttpOnly; nome default session_id.",
  },
} satisfies ZodOpenApiComponentsObject["securitySchemes"];

export const components = {
  schemas: {
    ErrorEnvelope,
    ValidationError,
    LegacyValidationError,
    ConflictError,
    PaginatedResponse,
    ErrorCode,
    FieldError,
  },
  parameters: {
    PageSize,
    RequesterEmail,
    RequesterIdentity,
  },
  securitySchemes,
} satisfies ZodOpenApiComponentsObject;
