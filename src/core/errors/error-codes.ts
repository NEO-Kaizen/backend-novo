export const EXPOSED_ERROR_CODES = [
  "validation_error",
  "not_found",
  "conflict",
  "unauthorized",
  "forbidden",
  "payload_too_large",
  "invalid_content_type",
  "rate_limited",
  "internal_error",
] as const;

/** Códigos estáveis em `snake_case`; o frontend decide comportamento por eles. */
export type ErrorCode = (typeof EXPOSED_ERROR_CODES)[number];
