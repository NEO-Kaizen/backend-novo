import type { Logger } from "../../../src/core/service/logger.ts";

export type LogEntry = {
  readonly level: "info" | "warn" | "error";
  readonly fields: Record<string, unknown>;
  readonly message: string;
};

/**
 * Logger que grava em vez de escrever no stdout: o teste inspeciona os
 * registros sem ruído de console. Os campos são copiados por superfície
 * rasa para a mutação de um teste não vazar ao registro já gravado.
 */
export class RecordingLogger implements Logger {
  private readonly recorded: LogEntry[] = [];

  info(fields: Record<string, unknown>, message: string): void {
    this.record("info", fields, message);
  }

  warn(fields: Record<string, unknown>, message: string): void {
    this.record("warn", fields, message);
  }

  error(fields: Record<string, unknown>, message: string): void {
    this.record("error", fields, message);
  }

  /** Registros no nível pedido, do mais antigo ao mais recente. */
  entries(level: LogEntry["level"]): readonly LogEntry[] {
    return this.recorded.filter((entry) => entry.level === level);
  }

  private record(level: LogEntry["level"], fields: Record<string, unknown>, message: string): void {
    this.recorded.push({ level, fields: { ...fields }, message });
  }
}
