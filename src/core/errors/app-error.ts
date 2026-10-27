import type { ErrorCode } from "./error-codes.ts";
import type { InternalErrorCode } from "./internal-codes.ts";

export type AppErrorCode = ErrorCode | InternalErrorCode;

/**
 * Erro de aplicação com código estável e status HTTP próprios.
 * `expose` decide se a mensagem chega ao cliente; o padrão é não chegar.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly expose: boolean;

  constructor(
    code: AppErrorCode,
    status: number,
    message: string,
    options: { readonly cause?: unknown; readonly expose?: boolean } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.expose = options.expose ?? false;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
