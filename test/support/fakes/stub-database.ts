import type { Knex } from "knex";
import { AppError } from "../../../src/core/errors/app-error.ts";
import { SERVER_ERROR_STATUS } from "../../../src/core/http/error-envelope.ts";
import type { Database } from "../../../src/core/repository/database.ts";
import type { Dialect } from "../../../src/core/repository/dialect.ts";
import { PostgresDialect } from "../../../src/platform/database/postgres-dialect.ts";
import type { TransactionManager } from "../../../src/core/repository/transaction-manager.ts";

/**
 * Stub da porta de persistência para a esteira rápida: nada aqui executa query.
 * Repositório que toca em `client` falha alto — teste de query é teste de
 * integração (arquivo com sufixo .integration.test.ts), não desta esteira.
 *
 * A forma de transação espelha o `KnexDatabase`: `run` e `runSnapshot` abrem o
 * contexto (profundidade conta para aninhamento) e `assertInTransaction`
 * lança só fora dele, para um service testado aqui não falhar por causa do
 * fake. `destroy` é no-op: não há pool a fechar.
 */
export class StubDatabase implements Database, TransactionManager {
  readonly dialect: Dialect;
  private transactionDepth = 0;

  constructor(options: { readonly dialect?: Dialect } = {}) {
    this.dialect = options.dialect ?? new PostgresDialect();
  }

  get client(): Knex {
    throw new Error(
      "StubDatabase não executa queries; use um banco real nos testes de integração.",
    );
  }

  assertInTransaction(): void {
    if (this.transactionDepth === 0) {
      throw new AppError("transaction_required", SERVER_ERROR_STATUS, "escrita fora de transação");
    }
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    return this.runInTransaction(work);
  }

  async runSnapshot<T>(work: () => Promise<T>): Promise<T> {
    return this.runInTransaction(work);
  }

  private async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    this.transactionDepth += 1;
    try {
      return await work();
    } finally {
      this.transactionDepth -= 1;
    }
  }

  async destroy(): Promise<void> {}
}
