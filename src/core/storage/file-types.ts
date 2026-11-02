/**
 * Catálogo fechado de tipos de arquivo aceitos na v1 (`04-API-Conventions.md`
 * §9). A extensão no disco vem daqui — nunca do nome original — então o
 * catálogo é a fonte única para storage, rota e fake de teste.
 *
 * O PDF, o OOXML e as imagens aceitas estão todos aqui; tipo fora do catálogo
 * não é gravado.
 */

/** Mensagem única do `415` de tipo de arquivo, na borda e no storage. */
export const UNSUPPORTED_FILE_TYPE_MESSAGE = "Tipo de arquivo não permitido.";
export const CANONICAL_EXTENSION_BY_MIME_TYPE: ReadonlyMap<string, string> = new Map([
  ["application/pdf", ".pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/svg+xml", ".svg"],
  ["image/vnd.microsoft.icon", ".ico"],
  ["image/webp", ".webp"],
  ["image/x-icon", ".ico"],
]);

/** Extensão canônica do MIME validado; `null` quando o tipo não é aceito. */
export function canonicalExtensionFor(mimeType: string): string | null {
  return CANONICAL_EXTENSION_BY_MIME_TYPE.get(mimeType.toLowerCase()) ?? null;
}
