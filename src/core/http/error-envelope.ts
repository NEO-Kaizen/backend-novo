export const SERVER_ERROR_STATUS = 500;
export const GENERIC_ERROR_MESSAGE = "Erro interno do servidor";
export const INTERNAL_ERROR_CODE = "internal_error";

export interface FieldError {
  readonly path: string;
  readonly message: string;
}

/**
 * Envelope legado vigente na v1 (ADR-0005). `code`, `requestId` e `fields` são
 * aditivos: o cliente atual lê `message` e ignora o resto.
 * `requestId` aqui é o id HTTP — a única exceção à nomenclatura do C11 (§12).
 */
export interface ErrorEnvelope {
  readonly status: "error";
  readonly statusCode: number;
  readonly message: string;
  readonly code?: string;
  readonly requestId?: string;
  readonly fields?: readonly FieldError[];
}

export type ErrorEnvelopeExtras = Pick<ErrorEnvelope, "code" | "requestId" | "fields">;

export function errorEnvelope(
  statusCode: number,
  message: string,
  extras: ErrorEnvelopeExtras = {},
): ErrorEnvelope {
  return { status: "error", statusCode, message, ...extras };
}
