import type { Clock } from "../../core/service/clock.ts";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
