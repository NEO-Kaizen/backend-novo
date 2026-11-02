export const INTERNAL_ERROR_CODE = "internal_error";

export const EXPOSED_ERROR_CODES = [
  "validation_error",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "payload_too_large",
  "invalid_content_type",
  "rate_limited",
  "not_the_assignee",          // <-- código de domínio (§ 12.2)
  "invalid_status_transition",  // <-- código de domínio (§ 12.2)
] as const;

/** Códigos estáveis em `snake_case`; o frontend decide comportamento por eles. */
export type ErrorCode = (typeof EXPOSED_ERROR_CODES)[number];
