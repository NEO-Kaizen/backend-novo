import type { DomainEvent, DomainEventPublisher } from "../../core/events/domain-event.ts";

type EventHandler = (event: DomainEvent<unknown>) => Promise<void>;

export class InMemoryDomainEventPublisher implements DomainEventPublisher {
  private readonly handlers = new Map<string, EventHandler[]>();

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    const registered = this.handlers.get(event.name) ?? [];
    for (const handler of registered) {
      await handler(event as DomainEvent<unknown>);
    }
  }

  subscribe<TPayload>(name: string, handler: (event: DomainEvent<TPayload>) => Promise<void>): void {
    const list = this.handlers.get(name) ?? [];
    list.push(handler as EventHandler);
    this.handlers.set(name, list);
  }
}