import type { Logger } from "./logger.js";
import type { Clock } from "./clock.js";
import type { IdGenerator } from "./id-generator.js";
import type { TransactionManager } from "../repository/transaction-manager.js";
import type { DomainEventPublisher } from "../events/domain-event.js";
import type { AuthorizationService } from "../authorization/authorization-service.js";
import type { Database } from "../repository/database.js";

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