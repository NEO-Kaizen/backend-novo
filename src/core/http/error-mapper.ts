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
    return new AppError(
      "payload_too_large",
      PAYLOAD_TOO_LARGE_STATUS,
      "Corpo da requisição excede o limite.",
      {
        cause: error,
        expose: true,
      },
    );
  }
  if (type === "request.aborted") {
    return new AppError("validation_error", VALIDATION_STATUS, "Requisição interrompida.", {
      cause: error,
      expose: true,
    });
  }
  if (type === "entity.parse.failed" || type === "entity.verify.failed") {
    return new AppError("validation_error", VALIDATION_STATUS, "Corpo da requisição inválido.", {
      cause: error,
      expose: true,
    });
  }
  if (type === "charset.unsupported" || type === "encoding.unsupported") {
    return new AppError(
      "invalid_content_type",
      UNSUPPORTED_MEDIA_STATUS,
      "Codificação do corpo não suportada.",
      {
        cause: error,
        expose: true,
      },
    );
  }

  if (readString(error, "name") === "MulterError") {
    return readString(error, "code") === "LIMIT_FILE_SIZE"
      ? new AppError(
          "payload_too_large",
          PAYLOAD_TOO_LARGE_STATUS,
          "Arquivo excede o limite de tamanho.",
          {
            cause: error,
            expose: true,
          },
        )
      : new AppError("validation_error", VALIDATION_STATUS, "Envio de arquivos inválido.", {
          cause: error,
          expose: true,
        });
  }

  return null;
}

function readString(source: unknown, key: string): string | undefined {
  if (typeof source !== "object" || source === null) {
    return undefined;
  }

  const value: unknown = Reflect.get(source, key);
  return typeof value === "string" ? value : undefined;
}
