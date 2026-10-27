import { randomUUID } from "node:crypto";
import type { IdGenerator } from "../../core/service/id-generator.ts";

export class UuidGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}
