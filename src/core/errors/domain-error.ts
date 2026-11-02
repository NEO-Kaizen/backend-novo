export interface RefusalContext {
  readonly action: string;
  readonly resource: string;
  readonly resourceId: string;
  readonly requestId?: string;
  readonly reason?: string;
}

export class DomainError extends Error {
  readonly code: string;
  readonly context?: RefusalContext;

  constructor(
    code: string,
    message: string,
    options: { context?: RefusalContext; cause?: unknown } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "DomainError";
    this.code = code;
    this.context = options.context;
  }
}

export function isAuditable(error: unknown): error is DomainError & { context: RefusalContext } {
  return error instanceof DomainError && error.context !== undefined;
}