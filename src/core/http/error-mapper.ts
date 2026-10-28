import { AppError, isAppError } from "../errors/app-error.ts";
import type { AppErrorCode } from "../errors/app-error.ts";
import { EXPOSED_ERROR_CODES, INTERNAL_ERROR_CODE } from "../errors/error-codes.ts";
import type { ErrorCode } from "../errors/error-codes.ts";
import { GENERIC_ERROR_MESSAGE, SERVER_ERROR_STATUS } from "./error-envelope.ts";

/** Fallback do kernel: `AppError` passa; o resto vira `internal_error`. */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError(INTERNAL_ERROR_CODE, SERVER_ERROR_STATUS, GENERIC_ERROR_MESSAGE, {
    cause: error,
  });
}

export interface ExposedError {
  readonly code: ErrorCode;
  readonly message: string;
}

/**
 * Projeta o erro para o cliente. `expose` e o catálogo decidem: código interno
 * com `expose: true` continua caindo em `internal_error`.
 */
export function toExposedError(error: AppError): ExposedError {
  if (!error.expose || error.code === INTERNAL_ERROR_CODE || !isErrorCode(error.code)) {
    return { code: INTERNAL_ERROR_CODE, message: GENERIC_ERROR_MESSAGE };
  }

  return { code: error.code, message: error.message };
}

function isErrorCode(code: AppErrorCode): code is ErrorCode {
  return (EXPOSED_ERROR_CODES as readonly string[]).includes(code);
}
