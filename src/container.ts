import type { Router } from "express";
import { createOpenApiDocument } from "./api-contract/openapi.ts";
import type { Config } from "./core/config/config.ts";
import type { ProtocolGenerator } from "./core/crypto/protocol-generator.ts";
import type { DomainEventPublisher } from "./core/events/domain-event.ts";
import type { RateLimiter } from "./core/http/rate-limiter.ts";
import type { Counter } from "./core/repository/counter.ts";
import type { Database } from "./core/repository/database.ts";
import type { TransactionManager } from "./core/repository/transaction-manager.ts";
import type { Clock } from "./core/service/clock.ts";
import type { IdGenerator } from "./core/service/id-generator.ts";
import type { Logger } from "./core/service/logger.ts";
import { SystemClock } from "./platform/clock/system-clock.ts";
import { FeistelProtocolGenerator } from "./platform/crypto/feistel-protocol-generator.ts";
import { createDatabase } from "./platform/database/create-database.ts";
import { KnexCounter } from "./platform/database/knex-counter.ts";
import { InMemoryDomainEventPublisher } from "./platform/events/in-memory-domain-event-publisher.ts";
import { createApiContractRouter } from "./platform/http/api-contract-router.ts";
import { InMemoryRateLimiter } from "./platform/http/in-memory-rate-limiter.ts";
import { UuidGenerator } from "./platform/ids/uuid-generator.ts";
import { createLogger } from "./platform/logging/create-logger.ts";

export interface Container {
  readonly config: Config;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly database: Database;
  readonly transactions: TransactionManager;
  readonly events: DomainEventPublisher;
  readonly counter: Counter;
  readonly protocol: ProtocolGenerator;
  readonly rateLimiter: RateLimiter;
  readonly apiContractRouter: Router | null;
}

/** Composition root: o único lugar que sabe quais implementações concretas existem. */
export function createContainer(config: Config): Container {
  const logger = createLogger(config);
  const database = createDatabase(config);
  const clock = new SystemClock();
  const ids = new UuidGenerator();

  // Novas instâncias de infraestrutura introduzidas pelo Kernel
  const events = new InMemoryDomainEventPublisher();
  const counter = new KnexCounter(database);
  const protocol = new FeistelProtocolGenerator(config.protocolSecret);
  const rateLimiter = new InMemoryRateLimiter();

  // O mesmo adapter implementa as duas portas de persistência
  const transactions: TransactionManager = database;

  return {
    config,
    logger,
    clock,
    ids,
    database,
    transactions,
    events,
    counter,
    protocol,
    rateLimiter,
    // O contrato é composto aqui; `platform` recebe o documento pronto.
    apiContractRouter: config.docs.isEnabled
      ? createApiContractRouter(createOpenApiDocument())
      : null,
  };
}