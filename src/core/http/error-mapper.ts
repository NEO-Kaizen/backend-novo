import { AppError, isAppError } from "../errors/app-error.ts";
import { GENERIC_ERROR_MESSAGE, SERVER_ERROR_STATUS } from "./error-envelope.ts";

const VALIDATION_STATUS = 400;
const PAYLOAD_TOO_LARGE_STATUS = 413;
const UNSUPPORTED_MEDIA_STATUS = 415;

/**
 * Traduz o erro uma única vez, na borda. Erros de `body-parser` e do `multer`
 * são reconhecidos pela forma (sem importar as libs aqui): o kernel não
 * conhece Express nem o parser de upload.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  const transportError = toAppErrorFromTransport(error);
  if (transportError !== null) {
    return transportError;
  }

  return new AppError("internal_error", SERVER_ERROR_STATUS, GENERIC_ERROR_MESSAGE, {
    cause: error,
  });
}

function toAppErrorFromTransport(error: unknown): AppError | null {
  const type = readString(error, "type");

  if (type === "entity.too.large") {
    return exposed(
      "payload_too_large",
      PAYLOAD_TOO_LARGE_STATUS,
      "Corpo da requisição excede o limite.",
      error,
    );
  }
  if (type === "entity.parse.failed" || type === "entity.verify.failed") {
    return exposed("validation_error", VALIDATION_STATUS, "Corpo da requisição inválido.", error);
  }
  if (type === "charset.unsupported" || type === "encoding.unsupported") {
    return exposed(
      "invalid_content_type",
      UNSUPPORTED_MEDIA_STATUS,
      "Codificação do corpo não suportada.",
      error,
    );
  }

  if (readString(error, "name") === "MulterError") {
    const code = readString(error, "code");

    if (code === "LIMIT_FILE_SIZE") {
      return exposed(
        "payload_too_large",
        PAYLOAD_TOO_LARGE_STATUS,
        "Arquivo excede o limite de tamanho.",
        error,
      );
    }
    // Parte JSON (`payload`/`assets`) acima de 2 MiB: §9 pede 413, não 400.
    if (code === "LIMIT_FIELD_VALUE") {
      return exposed(
        "payload_too_large",
        PAYLOAD_TOO_LARGE_STATUS,
        "Campo excede o limite de tamanho.",
        error,
      );
    }

    return exposed("validation_error", VALIDATION_STATUS, "Envio de arquivos inválido.", error);
  }

  return null;
}

/** Erros de transporte que podem ser expostos ao cliente, sempre com a causa preservada. */
function exposed(
  code: "payload_too_large" | "validation_error" | "invalid_content_type",
  status: number,
  message: string,
  cause: unknown,
): AppError {
  return new AppError(code, status, message, { cause, expose: true });
}

function readString(source: unknown, key: string): string | undefined {
  if (typeof source !== "object" || source === null) {
    return undefined;
  }

  const value: unknown = Reflect.get(source, key);
  return typeof value === "string" ? value : undefined;
}
