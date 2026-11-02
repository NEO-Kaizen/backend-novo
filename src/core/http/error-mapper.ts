import { AppError, isAppError } from "../errors/app-error.ts";
import type { AppErrorCode } from "../errors/app-error.ts";
import { DomainError, isDomainError } from "../errors/domain-error.ts";
import { EXPOSED_ERROR_CODES, INTERNAL_ERROR_CODE } from "../errors/error-codes.ts";
import type { ErrorCode } from "../errors/error-codes.ts";
import { GENERIC_ERROR_MESSAGE, SERVER_ERROR_STATUS } from "./error-envelope.ts";

/**
 * Tabela canônica de tradução: Código de Domínio -> Status HTTP (§ 12.4).
 * AppError já carrega o status internamente; DomainError consulta esta tabela.
 */
export const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  not_the_assignee: 403,
  invalid_status_transition: 409,
  internal_error: 500,
};

/**
 * Fallback do kernel:
 * 1. `AppError` passa diretamente;
 * 2. `DomainError` é traduzido para `AppError` usando `STATUS_BY_CODE`;
 * 3. Qualquer outro erro não tratado vira `internal_error` (status 500).
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (isDomainError(error)) {
    const status = STATUS_BY_CODE[error.code];

    // Se o código de domínio foi mapeado, vira AppError exposto com o status correto
    if (status !== undefined) {
      return new AppError(error.code as AppErrorCode, status, error.message, {
        expose: true,
        cause: error,
      });
    }

    // Se for um DomainError com código não catalogado, cai em 500 para não vazar detalhes
    return new AppError(INTERNAL_ERROR_CODE, SERVER_ERROR_STATUS, GENERIC_ERROR_MESSAGE, {
      cause: error,
    });
  }

  return new AppError(INTERNAL_ERROR_CODE, SERVER_ERROR_STATUS, GENERIC_ERROR_MESSAGE, {
    cause: error,
  });
}

export interface ExposedError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly status: number;
}

/**
 * Projeta o erro para o cliente. `expose` e o catálogo decidem: código interno
 * com `expose: true` continua caindo em `internal_error`, com status 500.
 */
export function toExposedError(error: AppError): ExposedError {
  if (!error.expose || error.code === INTERNAL_ERROR_CODE || !isErrorCode(error.code)) {
    return {
      code: INTERNAL_ERROR_CODE,
      message: GENERIC_ERROR_MESSAGE,
      status: SERVER_ERROR_STATUS,
    };
  }

  return { code: error.code, message: error.message, status: error.status };
}

function isErrorCode(code: AppErrorCode): code is ErrorCode {
  return (EXPOSED_ERROR_CODES as readonly string[]).includes(code);
}