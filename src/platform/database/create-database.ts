import knex from "knex";
import type { Knex } from "knex";
import type { Config, DatabaseConfig, DatabaseEngine } from "../../core/config/config.ts";
import type { Dialect } from "../../core/repository/dialect.ts";
import { KnexDatabase } from "./knex-database.ts";
import { PostgresDialect } from "./postgres-dialect.ts";

const POOL_MAX_CONNECTIONS = 10;

/** Monta o adapter de banco; o pool só abre conexão na primeira consulta. */
export function createDatabase(config: Config): KnexDatabase {
  const dialect = dialectFor(config.database.engine);
  return new KnexDatabase(createKnex(config.database), dialect);
}

function dialectFor(engine: DatabaseEngine): Dialect {
  if (engine === "postgres") {
    return new PostgresDialect();
  }

  throw new Error(`Engine "${engine}" ainda não tem dialeto implementado; use "postgres".`);
}

function createKnex(database: DatabaseConfig): Knex {
  return knex({
    client: "pg",
    connection: {
      host: database.host,
      port: database.port,
      database: database.name,
      user: database.user,
      password: database.password,
    },
    pool: { min: 0, max: POOL_MAX_CONNECTIONS },
  });
}
