import type { DatabaseEngine } from "../config/config.ts";

export interface Dialect {
  readonly name: DatabaseEngine;
  uuidType(): string;
  jsonType(): string;
  timestampType(): string;
  booleanType(): string;
  supportsReturning(): boolean;
  supportsRowLocks(): boolean;
  supportsUpsertMerge(): boolean;
  // TODO(#28): hexColorCheck() e auditAppendOnlyGuard() entram com as migrations,
  // quando houver consumidor e a suíte que os exercita nas três engines.
}
