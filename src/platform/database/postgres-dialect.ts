import type { Dialect } from "../../core/repository/dialect.ts";

export class PostgresDialect implements Dialect {
  readonly name = "postgres";

  uuidType(): string {
    return "uuid";
  }

  jsonType(): string {
    return "jsonb";
  }

  timestampType(): string {
    return "timestamptz";
  }

  booleanType(): string {
    return "boolean";
  }

  supportsReturning(): boolean {
    return true;
  }

  supportsRowLocks(): boolean {
    return true;
  }

  supportsUpsertMerge(): boolean {
    return true;
  }
}
