import { z } from "zod";
import { DATABASE_ENGINES, MEBIBYTE } from "../../core/config/config.ts";
import type { Config } from "../../core/config/config.ts";

const positiveInteger = () =>
  z.coerce
    .number({ error: "deve ser um número" })
    .int("deve ser inteiro")
    .positive("deve ser positivo");

/**
 * As variáveis de ambiente são planas; `Config` é aninhado (ver §16).
 * `toConfig` faz a tradução.
 */
export const EnvironmentSchema = z.strictObject({
  NODE_ENV: z.enum(["development", "test", "production"], {
    error: "obrigatória; use development, test ou production",
  }),
  PORT: positiveInteger().max(65_535, "deve ser no máximo 65535").default(3000),

  // Só postgres tem dialeto; sqlite/mysql falham no boot (§16/§10.2).
  DATABASE_ENGINE: z
    .enum(DATABASE_ENGINES, {
      error: `use ${DATABASE_ENGINES.join(", ")}`,
    })
    .default("postgres"),
  DATABASE_HOST: z.string({ error: "obrigatória" }).min(1, "não pode ser vazia"),
  DATABASE_PORT: positiveInteger().max(65_535, "deve ser no máximo 65535"),
  DATABASE_NAME: z.string({ error: "obrigatória" }).min(1, "não pode ser vazia"),
  DATABASE_USER: z.string({ error: "obrigatória" }).min(1, "não pode ser vazia"),
  // Autenticação por trust local é válida: exigida a presença, permitido o vazio.
  DATABASE_PASSWORD: z.string({ error: "obrigatória" }),
  DATABASE_ACQUIRE_TIMEOUT_MS: positiveInteger().default(10_000),
  DATABASE_CONNECT_TIMEOUT_MS: positiveInteger().default(5_000),
  DATABASE_STATEMENT_TIMEOUT_MS: positiveInteger().default(30_000),

  CORS_ORIGINS: z
    .string({ error: "obrigatória" })
    .min(1, "não pode ser vazia")
    .transform((value, ctx) => {
      const rawOrigins = value
        .split(",")
        .map((rawOrigin) => rawOrigin.trim())
        .filter((rawOrigin) => rawOrigin.length > 0);

      if (rawOrigins.length === 0) {
        ctx.addIssue({ code: "custom", message: "informe ao menos uma origem" });
        return [];
      }

      const origins: string[] = [];
      for (const [index, rawOrigin] of rawOrigins.entries()) {
        const origin = normalizeOrigin(rawOrigin);
        if (origin === null) {
          ctx.addIssue({
            code: "custom",
            message: `origem inválida na posição ${index + 1}: use esquema, host e porta, sem caminho, credencial, query ou hash`,
          });
          continue;
        }
        origins.push(origin);
      }
      return origins;
    }),

  JWT_SECRET: z.string({ error: "obrigatória" }).min(32, "mínimo de 32 caracteres"),
  JWT_EXPIRES_IN: z
    .string({ error: "obrigatória" })
    .regex(/^\d+[smhd]$/, "formato inválido (ex.: 1d)")
    .default("1d"),
  COOKIE_NAME: z
    .string({ error: "obrigatória" })
    .min(1, "não pode ser vazia")
    .max(64, "máximo de 64 caracteres")
    .regex(/^[A-Za-z0-9_.-]+$/, "use apenas letras, dígitos, ponto, hífen e sublinhado")
    .default("session_id"),
  PROTOCOL_SECRET: z.string({ error: "obrigatória" }).min(32, "mínimo de 32 caracteres"),

  UPLOAD_MAX_FILE_BYTES: positiveInteger().default(10 * MEBIBYTE),
  UPLOAD_MAX_FILES: positiveInteger().default(5),
  JSON_BODY_MAX_BYTES: positiveInteger().default(MEBIBYTE),

  // Documentação HTTP: opt-in em produção; fora dela o default é habilitado.
  DOCS_ENABLED: z
    .enum(["true", "false"], { error: "use true ou false" })
    .transform((value) => value === "true")
    .optional(),
});

export type EnvironmentVariables = z.infer<typeof EnvironmentSchema>;

export function toConfig(environment: EnvironmentVariables): Config {
  const isProduction = environment.NODE_ENV === "production";

  return {
    environment: environment.NODE_ENV,
    port: environment.PORT,
    database: {
      engine: environment.DATABASE_ENGINE,
      host: environment.DATABASE_HOST,
      port: environment.DATABASE_PORT,
      name: environment.DATABASE_NAME,
      user: environment.DATABASE_USER,
      password: environment.DATABASE_PASSWORD,
      acquireTimeoutMs: environment.DATABASE_ACQUIRE_TIMEOUT_MS,
      connectTimeoutMs: environment.DATABASE_CONNECT_TIMEOUT_MS,
      statementTimeoutMs: environment.DATABASE_STATEMENT_TIMEOUT_MS,
    },
    cors: { origins: environment.CORS_ORIGINS },
    jwtSecret: environment.JWT_SECRET,
    jwtExpiresIn: environment.JWT_EXPIRES_IN,
    cookieName: environment.COOKIE_NAME,
    protocolSecret: environment.PROTOCOL_SECRET,
    uploads: {
      maxFileBytes: environment.UPLOAD_MAX_FILE_BYTES,
      maxFiles: environment.UPLOAD_MAX_FILES,
      jsonBodyMaxBytes: environment.JSON_BODY_MAX_BYTES,
    },
    docs: { enabled: environment.DOCS_ENABLED ?? !isProduction },
  };
}

/** Aceita apenas origem absoluta (esquema, host e porta), sem caminho, query ou credencial. */
function normalizeOrigin(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const isOriginOnly =
    url.pathname === "/" &&
    url.search === "" &&
    url.hash === "" &&
    url.username === "" &&
    url.password === "";

  return isOriginOnly && url.origin !== "null" ? url.origin : null;
}
