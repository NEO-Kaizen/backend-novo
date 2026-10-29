import type { Clock } from "../../../src/core/service/clock.ts";

/**
 * Relógio determinístico: o domínio lê `now()` e recebe sempre o mesmo
 * instante até o teste avançar o tempo. O instante inicial fica no arquivo
 * de teste para o cenário ficar legível lá, não aqui.
 */
export class FixedClock implements Clock {
  private current: Date;

  constructor(date: Date | string) {
    this.current = new Date(date);
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  /** Avança o relógio em milissegundos. */
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
