import { createReadStream, statSync } from "node:fs";
import { mkdir, open, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { Transform } from "node:stream";
import type { Readable, TransformCallback } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AppError } from "../../core/errors/app-error.ts";
import { VALIDATION_STATUS, UNSUPPORTED_MEDIA_STATUS } from "../../core/http/error-envelope.ts";
import {
  CANONICAL_EXTENSION_BY_MIME_TYPE,
  canonicalExtensionFor,
  UNSUPPORTED_FILE_TYPE_MESSAGE,
} from "../../core/storage/file-types.ts";
import { PUBLIC_UPLOADS_PATH } from "../../core/storage/file-storage.ts";
import type { FileStorage, SaveFileInput, StoredFile } from "../../core/storage/file-storage.ts";
import type { IdGenerator } from "../../core/service/id-generator.ts";

export interface LocalFileStorageOptions {
  /** Raiz de `UPLOADS_DIR`; `public/` e `private/` vivem abaixo dela. */
  readonly directory: string;
  readonly ids: IdGenerator;
}

const PUBLIC_DIRECTORY = "public";
const PRIVATE_DIRECTORY = "private";

/**
 * Id do arquivo no disco: UUID v4 + extensão canônica. O padrão também barra
 * `..`, `/` e bytes nulos recebidos em `open`/`remove`, porque nenhum id
 * válido contém separador de caminho — e a extensão é conferida contra o
 * catálogo, não contra um formato livre.
 */
const STORED_FILE_ID_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(\.[a-z0-9]{2,5})$/;

const CANONICAL_EXTENSIONS = new Set(CANONICAL_EXTENSION_BY_MIME_TYPE.values());

/** Limite de `attachments.file_name` (`03-Data-Model.md` §8.3). */
const MAX_ORIGINAL_NAME_LENGTH = 255;
const PATH_SEPARATORS = ["/", "\\", "\0"];
const TRAVERSAL_SEQUENCE = "..";

/**
 * Storage local em disco. `save` grava em `UPLOADS_DIR/public` ou
 * `UPLOADS_DIR/private` sob nome gerado (nunca o nome original); `publicUrl`
 * só responde por arquivo `public`, e `private` não tem URL pública.
 */
export class LocalFileStorage implements FileStorage {
  private readonly ids: IdGenerator;
  private readonly publicDirectory: string;
  private readonly privateDirectory: string;

  constructor(options: LocalFileStorageOptions) {
    this.ids = options.ids;
    this.publicDirectory = join(options.directory, PUBLIC_DIRECTORY);
    this.privateDirectory = join(options.directory, PRIVATE_DIRECTORY);
  }

  async save(input: SaveFileInput): Promise<StoredFile> {
    const originalName = assertOriginalName(input.originalName);
    assertDeclaredSize(input.size);

    const extension = canonicalExtensionFor(input.mimeType);
    if (extension === null) {
      throw new AppError(
        "invalid_content_type",
        UNSUPPORTED_MEDIA_STATUS,
        UNSUPPORTED_FILE_TYPE_MESSAGE,
        { expose: true },
      );
    }

    const isPublic = input.visibility === "public";
    const directory = isPublic ? this.publicDirectory : this.privateDirectory;
    const id = `${this.ids.next()}${extension}`;
    assertStoredFileId(id);

    const target = join(directory, id);
    await mkdir(directory, { recursive: true });
    const size = await writeFileFromStream(target, input.stream);

    // O tamanho declarado é o conferido na borda; divergência é arquivo
    // truncado ou inflado, e nesse caso nada fica no disco.
    if (size !== input.size) {
      await discard(target);
      throw invalidInput("Tamanho do arquivo não confere com o enviado.");
    }

    return {
      id,
      url: isPublic ? `${PUBLIC_UPLOADS_PATH}/${id}` : null,
      mimeType: input.mimeType,
      size,
      originalName,
    };
  }

  async open(id: string): Promise<Readable> {
    assertStoredFileId(id);
    return createReadStream(await this.find(id));
  }

  async remove(id: string): Promise<void> {
    assertStoredFileId(id);
    await Promise.all([
      rm(join(this.privateDirectory, id), { force: true }),
      rm(join(this.publicDirectory, id), { force: true }),
    ]);
  }

  publicUrl(id: string): string {
    assertStoredFileId(id);

    // A porta é síncrona; um `stat` barato evita devolver URL de arquivo que
    // não existe (ou que está em `private`, que não tem superfície pública).
    const isPublicFile = statSync(join(this.publicDirectory, id), {
      throwIfNoEntry: false,
    })?.isFile();
    if (isPublicFile !== true) {
      throw notFound();
    }

    return `${PUBLIC_UPLOADS_PATH}/${id}`;
  }

  private async find(id: string): Promise<string> {
    for (const directory of [this.privateDirectory, this.publicDirectory]) {
      const path = join(directory, id);
      const stats = await stat(path, { throwIfNoEntry: false });
      if (stats?.isFile() === true) {
        return path;
      }
    }

    throw notFound();
  }
}

function assertOriginalName(originalName: string): string {
  const hasPathSeparator = PATH_SEPARATORS.some((separator) => originalName.includes(separator));
  const isUsable =
    originalName.length > 0 &&
    originalName.length <= MAX_ORIGINAL_NAME_LENGTH &&
    originalName !== "." &&
    !hasPathSeparator &&
    !originalName.includes(TRAVERSAL_SEQUENCE);

  if (!isUsable) {
    throw invalidInput("Nome do arquivo inválido.");
  }

  return originalName;
}

function assertStoredFileId(id: string): void {
  const match = STORED_FILE_ID_PATTERN.exec(id);
  const extension = match?.[2];

  if (extension === undefined || !CANONICAL_EXTENSIONS.has(extension)) {
    throw invalidInput("Identificador de arquivo inválido.");
  }
}

function assertDeclaredSize(size: number): void {
  if (!Number.isInteger(size) || size <= 0) {
    throw invalidInput("Tamanho de arquivo inválido.");
  }
}

/**
 * Grava o stream e devolve o total escrito. O arquivo é aberto em modo
 * exclusivo antes do pipeline, então uma falha nunca apaga um arquivo que já
 * existia, e o parcial é descartado no `catch`.
 */
async function writeFileFromStream(target: string, source: Readable): Promise<number> {
  const handle = await open(target, "wx");
  let size = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback: TransformCallback): void {
      size += chunk.length;
      callback(null, chunk);
    },
  });

  try {
    await pipeline(source, counter, handle.createWriteStream({ autoClose: true }));
  } catch (error) {
    await handle.close().catch(() => undefined);
    await discard(target);
    throw error;
  }

  return size;
}

/** Limpeza best-effort: o erro original é o que sobe, não o da limpeza. */
async function discard(target: string): Promise<void> {
  await rm(target, { force: true }).catch(() => undefined);
}

function invalidInput(message: string): AppError {
  return new AppError("validation_error", VALIDATION_STATUS, message, { expose: true });
}

function notFound(): AppError {
  return new AppError("not_found", 404, "Arquivo não encontrado.", { expose: true });
}
