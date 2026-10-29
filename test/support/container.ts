import type { Config } from "../../src/core/config/config.ts";
import type { Container } from "../../src/container.ts";
import type { Database } from "../../src/core/repository/database.ts";
import type { TransactionManager } from "../../src/core/repository/transaction-manager.ts";
import { createTestConfig } from "./config.ts";
import { FixedClock } from "./fakes/fixed-clock.ts";
import { RecordingLogger } from "./fakes/recording-logger.ts";
import { SequentialIdGenerator } from "./fakes/sequential-id-generator.ts";
import { StubDatabase } from "./fakes/stub-database.ts";

/** O instante default de todos os testes: meio-dia UTC de uma data fixa. */
const DEFAULT_TEST_NOW = new Date("2026-01-15T12:00:00.000Z");

export interface TestContainerOverrides {
  readonly config?: Config;
  readonly clock?: FixedClock;
  readonly ids?: SequentialIdGenerator;
  readonly logger?: RecordingLogger;
  /** Porta de persistência: a mesma implementação fecha `Database` e `TransactionManager`. */
  readonly database?: Database & TransactionManager;
}

/**
 * O `Container` de teste: deriva da porta de produção e estreita as bordas
 * com os fakes concretos. Atribuível a `Container`, então `createApp` o
 * aceita sem cast — e a inspeção de `logger`/`clock`/`ids` é direta.
 * Quando `Container` ganhar campo novo, o compilador aponta aqui.
 */
export type TestContainer = Container & {
  readonly logger: RecordingLogger;
  readonly clock: FixedClock;
  readonly ids: SequentialIdGenerator;
  readonly database: Database & TransactionManager;
};

/**
 * Composition root de teste: espelha `src/container.ts`, mas com fakes no
 * lugar dos adapters de borda. Trocar um fake por outra implementação exige
 * subclasse da classe fake — os overrides assumem as classes deste diretório
 * para o tipo garantir o que um teste pode inspecionar. O router de docs
 * fica `null` por default (config já traz `DOCS_ENABLED=false`): nenhum
 * teste desta esteira precisa do bundle.
 */
export function createTestContainer(overrides: TestContainerOverrides = {}): TestContainer {
  const config = overrides.config ?? createTestConfig();
  const database = overrides.database ?? new StubDatabase();

  return {
    config,
    logger: overrides.logger ?? new RecordingLogger(),
    clock: overrides.clock ?? new FixedClock(DEFAULT_TEST_NOW),
    ids: overrides.ids ?? new SequentialIdGenerator(),
    database,
    transactions: database,
    apiContractRouter: null,
  };
}
