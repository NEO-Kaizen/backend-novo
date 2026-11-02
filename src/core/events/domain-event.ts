import type { Actor } from "../actor.ts";

export interface DomainEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly name: string;
  readonly occurredAt: Date;
  readonly actor: Actor;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly correlationId: string;
  readonly requestId?: string;
  readonly previous?: unknown;
  readonly new?: unknown;
  readonly note?: string;
  readonly lastTechnicalMessage?: string;
  readonly payload: TPayload;
}

export interface DomainEventPublisher {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  subscribe<TPayload>(name: string, handler: (event: DomainEvent<TPayload>) => Promise<void>): void;
}