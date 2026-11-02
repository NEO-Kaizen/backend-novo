import type { Readable } from "node:stream";

/** `public` é servido por `/uploads/*`; `private` só sai por rota autorizada. */
export const FILE_VISIBILITIES = ["public", "private"] as const;

/** Prefixo da superfície pública; só arquivos `public` aparecem por ele. */
export const PUBLIC_UPLOADS_PATH = "/uploads";

export type FileVisibility = (typeof FILE_VISIBILITIES)[number];

/** Arquivo a gravar; `size` é o tamanho conferido na borda. */
export interface SaveFileInput {
  readonly stream: Readable;
  readonly originalName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly visibility: FileVisibility;
}

export interface StoredFile {
  readonly id: string;
  /** Só existe para `visibility: "public"`; anexo privado não tem URL pública. */
  readonly url: string | null;
  readonly mimeType: string;
  readonly size: number;
  readonly originalName: string;
}

/**
 * Porta de armazenamento de arquivos. Não conhece HTTP nem autorização: quem
 * decide se o arquivo pode ser baixado é a rota, não o storage.
 *
 * `remove` é idempotente — arquivo ausente não é erro, porque a limpeza de
 * órfão não pode falhar por já ter limpado. `open` de id inexistente lança
 * `not_found`.
 */
export interface FileStorage {
  save(input: SaveFileInput): Promise<StoredFile>;
  open(id: string): Promise<Readable>;
  remove(id: string): Promise<void>;
  publicUrl(id: string): string;
}
