import type { Knex } from "knex";
import { AppError } from "../errors/app-error.ts";

/**
 * Realiza a leitura estrita por protocolo.
 * NUNCA usa .first(). Se encontrar 2 registros, falha ruidosamente.
 */
export async function findSingleByProtocol<T>(
  client: Knex,
  tableName: string,
  protocol: string
): Promise<T | null> {
  const rows = await client<T>(tableName)
    .where({ protocol })
    .limit(2);

  if (rows.length === 0) {
    return null;
  }

  if (rows.length > 1) {
    throw new AppError(
      "protocol_collision",
      500,
      `Falha crítica de integridade: colisão detectada no protocolo ${protocol}.`,
      { expose: false }
    );
  }

  return rows[0] as T;
}