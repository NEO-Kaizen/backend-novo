import { AppError, isAppError } from "../../core/errors/app-error.ts";
import type { ErrorCode } from "../../core/errors/error-codes.ts";
import {
  PAYLOAD_TOO_LARGE_STATUS,
  UNSUPPORTED_MEDIA_STATUS,
  VALIDATION_STATUS,
} from "../../core/http/error-envelope.ts";
import { toAppError } from "../../core/http/error-mapper.ts";

interface TransportMapping {
  readonly code: ErrorCode;
  readonly status: number;
  readonly message: string;
}

const INVALID_BODY: TransportMapping = {
  code: "validation_error",
  status: VALIDATION_STATUS,
  message: "Corpo da requisição inválido.",
};

const UNSUPPORTED_ENCODING: TransportMapping = {
  code: "invalid_content_type",
  status: UNSUPPORTED_MEDIA_STATUS,
  message: "Codificação do corpo não suportada.",
};

const BODY_PARSER_ERRORS: Readonly<Record<string, TransportMapping>> = {
  "entity.too.large": {
    code: "payload_too_large",
    status: PAYLOAD_TOO_LARGE_STATUS,
    message: "Corpo da requisição excede o limite.",
  },
  "entity.parse.failed": INVALID_BODY,
  "entity.verify.failed": INVALID_BODY,
  "charset.unsupported": UNSUPPORTED_ENCODING,
  "encoding.unsupported": UNSUPPORTED_ENCODING,
};

const MULTER_ERRORS: Readonly<Record<string, TransportMapping>> = {
  LIMIT_FILE_SIZE: {
    code: "payload_too_large",
    status: PAYLOAD_TOO_LARGE_STATUS,
    message: "Arquivo excede o limite de tamanho.",
  },
  // Parte JSON (`payload`/`assets`) acima de 2 MiB: §9 pede 413, não 400.
  LIMIT_FIELD_VALUE: {
    code: "payload_too_large",
    status: PAYLOAD_TOO_LARGE_STATUS,
    message: "Campo excede o limite de tamanho.",
  },
};

const MULTER_FALLBACK: TransportMapping = {
  code: "validation_error",
  status: VALIDATION_STATUS,
  message: "Envio de arquivos inválido.",
};

/**
 * Traduz o erro HTTP na borda: `body-parser` e `multer` são reconhecidos pela
 * forma, sem que o core importe as libs. O restante cai no `toAppError` genérico.
 */
export function toHttpAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return fromBodyParser(error) ?? fromMulter(error) ?? toAppError(error);
}

function fromBodyParser(error: unknown): AppError | null {
  const type = readString(error, "type");
  const mapping = type === undefined ? undefined : BODY_PARSER_ERRORS[type];
  return mapping === undefined ? null : createExposedAppError(mapping, error);
}

function fromMulter(error: unknown): AppError | null {
  if (readString(error, "name") !== "MulterError") {
    return null;
  }

  const code = readString(error, "code");
  const mapping = code === undefined ? undefined : MULTER_ERRORS[code];
  return createExposedAppError(mapping ?? MULTER_FALLBACK, error);
}

function createExposedAppError(mapping: TransportMapping, cause: unknown): AppError {
  return new AppError(mapping.code, mapping.status, mapping.message, { cause, expose: true });
}

function readString(source: unknown, key: string): string | undefined {
  if (typeof source !== "object" || source === null) {
    return undefined;
  }

  const value: unknown = Reflect.get(source, key);
  return typeof value === "string" ? value : undefined;
}
