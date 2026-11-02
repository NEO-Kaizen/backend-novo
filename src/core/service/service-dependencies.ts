import type { Logger } from "./logger.ts";
import type { Clock } from "./clock.ts";
import type { IdGenerator } from "./id-generator.ts";
import type { TransactionManager } from "../repository/transaction-manager.ts";
import type { DomainEventPublisher } from "../events/domain-event.ts";
import type { AuthorizationService } from "../authorization/authorization-service.ts";
import type { Database } from "../repository/database.ts";

// Dependências que a classe BaseService exige
export interface ServiceDependencies {
  readonly logger: Logger;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly transactions: TransactionManager;
  readonly events: DomainEventPublisher;
}

// Dependências de casos de uso com autorização
export interface UseCaseDependencies extends ServiceDependencies {
  readonly authorization: AuthorizationService;
}

// O que a fábrica do módulo (createXModule) recebe no container.
// Note que database vive aqui, mas a fábrica o repassa ao repositório, não ao service!
export interface ModuleDependencies extends UseCaseDependencies {
  readonly database: Database;
}