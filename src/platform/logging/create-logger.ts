import type { Config, Environment } from "../../core/config/config.ts";
import type { Logger } from "../../core/service/logger.ts";

type Level = "info" | "warn" | "error";

const LEVEL_PRIORITY: Readonly<Record<Level, number>> = { info: 30, warn: 40, error: 50 };
const SILENT_THRESHOLD = 100;
const REDACTED = "[redacted]";
const TRUNCATED = "[truncated]";
const CIRCULAR = "[circular]";
const SENSITIVE_KEY = /authorization|cookie|password|token|secret/i;
const MAX_DEPTH = 3;

/**
 * Adapter de log: uma linha JSON por evento em stdout, com nível e campos.
 * O nível mínimo vem do ambiente — não há `LOG_LEVEL` no schema.
 */
export function createLogger(config: Config): Logger {
  const threshold = thresholdFor(config.environment);

  return {
    info: (fields, message) => write("info", threshold, fields, message),
    warn: (fields, message) => write("warn", threshold, fields, message),
    error: (fields, message) => write("error", threshold, fields, message),
  };
}

function thresholdFor(environment: Environment): number {
  return environment === "test" ? SILENT_THRESHOLD : LEVEL_PRIORITY.info;
}

function write(
  level: Level,
  threshold: number,
  fields: Record<string, unknown>,
  message: string,
): void {
  if (LEVEL_PRIORITY[level] < threshold) {
    return;
  }

  const line = {
    ...sanitize(fields, 0),
    level,
    time: new Date().toISOString(),
    message,
  };
  process.stdout.write(`${JSON.stringify(line)}\n`);
}

/**
 * Redige chave sensível em qualquer profundidade e serializa `Error` sem perder a causa.
 * Sem `seen` (topo), cada campo tem seu próprio conjunto: o mesmo objeto em dois campos
 * é logado duas vezes, não vira `[circular]`; ciclos dentro do mesmo campo seguem detectados.
 */
function sanitize(source: object, depth: number, seen?: WeakSet<object>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    sanitized[key] = SENSITIVE_KEY.test(key)
      ? REDACTED
      : sanitizeValue(value, depth, seen ?? new WeakSet());
  }

  return sanitized;
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value instanceof Error) {
    if (seen.has(value)) {
      return CIRCULAR;
    }
    seen.add(value);

    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value.cause === undefined || depth >= MAX_DEPTH
        ? {}
        : { cause: sanitizeValue(value.cause, depth + 1, seen) }),
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return depth >= MAX_DEPTH
      ? TRUNCATED
      : value.map((item) => sanitizeValue(item, depth + 1, seen));
  }

  if (typeof value === "object" && value !== null) {
    if (depth >= MAX_DEPTH) {
      return TRUNCATED;
    }
    if (seen.has(value)) {
      return CIRCULAR;
    }
    seen.add(value);
    return sanitize(value, depth + 1, seen);
  }

  return value;
}
