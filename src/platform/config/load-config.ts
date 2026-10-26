import type { Config } from "../../core/config/config.ts";
import { EnvironmentSchema, toConfig } from "./environment-schema.ts";

/**
 * `process.env` carrega variáveis alheias ao schema (PATH, HOME, …); o schema
 * é `strictObject`, então só as chaves conhecidas entram na validação. A lista
 * vem do próprio schema para não haver uma terceira cópia da forma do ambiente.
 */
function pickEnvironment(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const picked: Record<string, string | undefined> = {};
  for (const key of Object.keys(EnvironmentSchema.shape)) {
    picked[key] = source[key];
  }
  return picked;
}

/** Ponto único de leitura do ambiente (§16). Nenhum outro módulo lê `process.env`. */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const result = EnvironmentSchema.safeParse(pickEnvironment(source));

  if (!result.success) {
    // Erros listam a variável e o motivo; o valor recebido nunca é ecoado.
    const lines = result.error.issues.map((issue) => {
      const name = issue.path.length > 0 ? issue.path.join(".") : "(raiz)";
      return `${name}: ${issue.message}`;
    });
    throw new Error(`Configuração de ambiente inválida:\n${lines.join("\n")}`);
  }

  return toConfig(result.data);
}
