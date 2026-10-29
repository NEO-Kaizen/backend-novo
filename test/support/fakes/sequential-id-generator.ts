import type { IdGenerator } from "../../../src/core/service/id-generator.ts";

const COUNTER_HEX_DIGITS = 12;
const COUNTER_MAX = Number.parseInt("f".repeat(COUNTER_HEX_DIGITS), 16);
const UUID_PREFIX = "00000000-0000-4000-8000-";

/** Serializa o contador no trailer v4 de comprimento fixo. */
function buildSequentialId(counter: number): string {
  return `${UUID_PREFIX}${counter.toString(16).padStart(COUNTER_HEX_DIGITS, "0")}`;
}

/**
 * Primeiro id emitido por um gerador recém-construído; os testes comparam
 * contra ele em vez de repetir o literal. Mesma formatação de `next()`.
 */
export const FIRST_SEQUENTIAL_ID = buildSequentialId(1);

/**
 * Gerador determinístico: ids em sequência, válidos como UUID v4 (nibble de
 * versão `4`, variante `8`). O `x-request-id` do middleware valida UUID, e o
 * id gerado passa por ele — por isso a forma v4 não é acidental.
 */
export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  next(): string {
    if (this.isAtLimit()) {
      throw new Error(`SequentialIdGenerator esgotou a sequência de ${COUNTER_HEX_DIGITS} dígitos`);
    }

    this.counter += 1;
    return buildSequentialId(this.counter);
  }

  private isAtLimit(): boolean {
    return this.counter >= COUNTER_MAX;
  }
}
