import type { Config } from "./core/config/config.ts";
import type { Database } from "./core/repository/database.ts";
import type { TransactionManager } from "./core/repository/transaction-manager.ts";
import type { Clock } from "./core/service/clock.ts";
import type { IdGenerator } from "./core/service/id-generator.ts";
import type { Logger } from "./core/service/logger.ts";
import { SystemClock } from "./platform/clock/system-clock.ts";
import { createDatabase } from "./platform/database/create-database.ts";
import { UuidGenerator } from "./platform/ids/uuid-generator.ts";
import { createLogger } from "./platform/logging/create-logger.ts";

export interface Container {
  readonly config: Config;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly database: Database;
  readonly transactions: TransactionManager;
}

/** Composition root: o único lugar que sabe quais implementações concretas existem. */
export function createContainer(config: Config): Container {
  const logger = createLogger(config);
  const database = createDatabase(config);

  return {
    config,
    logger,
    clock: new SystemClock(),
    ids: new UuidGenerator(),
    database,
    // O mesmo adapter implementa as duas portas de persistência.
    transactions: database,
  };
}
