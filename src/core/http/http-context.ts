import type { Actor } from "../actor.ts";
import type { Page } from "../pagination/page.ts";

export interface HttpContext {
  readonly request: {
    readonly body: unknown;
    readonly params: Readonly<Record<string, string>>;
    readonly query: Readonly<Record<string, unknown>>;
    readonly headers: Readonly<Record<string, string | undefined>>;
  };
  readonly actor: Actor;
  readonly requestId: string;
  readonly ok: (body: unknown) => void;
  readonly created: (body: unknown) => void;
  readonly noContent: () => void;
  readonly paginated: (page: Page<unknown>) => void;
  readonly fail: (error: unknown) => void;
}