import { AsyncLocalStorage } from "node:async_hooks";
import type { Knex } from "knex";
import { AppError } from "../../core/errors/app-error.ts";
import type { Database } from "../../core/repository/database.ts";
import type { Dialect } from "../../core/repository/dialect.ts";
import type { TransactionManager } from "../../core/repository/transaction-manager.ts";

const READ_SNAPSHOT_ISOLATION: Knex.IsolationLevels = "repeatable read";

/**
 * Implementa `Database` e `TransactionManager` sobre um único pool Knex.
 * A transação corrente viaja em `AsyncLocalStorage`: o repositório não recebe
 * `trx` como parâmetro e `assertInTransaction()` transforma "esqueci a
 * transação" em falha barulhenta.
 */
export class KnexDatabase implements Database, TransactionManager {
  readonly dialect: Dialect;
  private readonly knex: Knex;
  private readonly scope = new AsyncLocalStorage<Knex.Transaction>();

  constructor(knex: Knex, dialect: Dialect) {
    this.knex = knex;
    this.dialect = dialect;
  }

  get client(): Knex {
    return this.scope.getStore() ?? this.knex;
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    return this.runInTransaction(work);
  }

  async runSnapshot<T>(work: () => Promise<T>): Promise<T> {
    return this.runInTransaction(work, READ_SNAPSHOT_ISOLATION);
  }

  assertInTransaction(): void {
    if (this.scope.getStore() === undefined) {
      throw new AppError("transaction_required", 500, "escrita fora de transação");
    }
  }

  async destroy(): Promise<void> {
    await this.knex.destroy();
  }

  private async runInTransaction<T>(
    work: () => Promise<T>,
    isolationLevel?: Knex.IsolationLevels,
  ): Promise<T> {
    const current = this.scope.getStore();

    if (current !== undefined) {
      // Aninhamento é savepoint: herda o isolamento da transação externa.
      return current.transaction((nested) => this.scope.run(nested, work));
    }

    return this.knex.transaction(
      (transaction) => this.scope.run(transaction, work),
      isolationLevel === undefined ? undefined : { isolationLevel },
    );
  }
}
