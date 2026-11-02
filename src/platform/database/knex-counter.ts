import type { Counter } from "../../core/repository/counter.ts";
import type { Database } from "../../core/repository/database.ts";
import { AppError } from "../../core/errors/app-error.ts";

export class KnexCounter implements Counter {
  constructor(private readonly database: Database) {}

  async next(name: string): Promise<number> {
    this.database.assertInTransaction();

    // Incrementa atomicamente dentro da transação
    const updated = await this.database.client("code_counters")
      .where({ name })
      .increment("value", 1);

    // Bootstrap atômico: se o contador não existia, inicia com 1
    if (updated === 0) {
      await this.database.client("code_counters").insert({
        name,
        value: 1,
        updated_at: new Date(),
      });
      return 1;
    }

    const row = await this.database.client<{ value: string | number }>("code_counters")
      .where({ name })
      .first("value");

    if (!row) {
      throw new AppError("counter_missing", 500, "Contador ausente.", { expose: false });
    }

    return Number(row.value);
  }
}