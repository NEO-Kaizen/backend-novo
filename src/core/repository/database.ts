import type { Knex } from "knex";
import type { Dialect } from "./dialect.ts";

/** Porta de persistência: repositórios falam com ela, nunca com o Knex direto. */
export interface Database {
  /** Handle de consulta ativo: a transação em curso, quando existir. */
  readonly client: Knex;
  readonly dialect: Dialect;
  /** Falha se não houver transação corrente. */
  assertInTransaction(): void;
  destroy(): Promise<void>;
}
