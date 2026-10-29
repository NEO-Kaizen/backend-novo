/**
 * Roda antes de cada arquivo de teste, nos dois projetos (rápida e de
 * integração). Nada global vaza entre arquivos: o Vitest roda cada um
 * isolado; este arquivo só afeta os módulos que ele carrega.
 *
 * O fuso vem de `env` no config do Vitest (`TZ=UTC`), não daqui — e o
 * `DATABASE_*`/segredos de teste também, porque nenhum módulo de teste
 * lê `process.env` direto (CODING_STANDARDS.md §4).
 */
import { z } from "zod";

// Catálogo pt-BR por campo (CODING_STANDARDS.md §6.1). O fallback evita a
// mensagem default em inglês quando o domínio esquece o catálogo próprio.
z.config(z.locales.ptBR());
