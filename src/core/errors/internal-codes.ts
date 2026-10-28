export const INTERNAL_ERROR_CODES = ["transaction_required"] as const;

/** Códigos internos: chegar a eles é bug e eles nunca são expostos ao cliente. */
export type InternalErrorCode = (typeof INTERNAL_ERROR_CODES)[number];
