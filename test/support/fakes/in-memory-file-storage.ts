import { Readable } from "node:stream";
import { AppError } from "../../../src/core/errors/app-error.ts";
import { UNSUPPORTED_MEDIA_STATUS } from "../../../src/core/http/error-envelope.ts";
import {
  canonicalExtensionFor,
  UNSUPPORTED_FILE_TYPE_MESSAGE,
} from "../../../src/core/storage/file-types.ts";
import { PUBLIC_UPLOADS_PATH } from "../../../src/core/storage/file-storage.ts";
import type {
  FileStorage,
  SaveFileInput,
  StoredFile,
} from "../../../src/core/storage/file-storage.ts";
import type { IdGenerator } from "../../../src/core/service/id-generator.ts";

interface MemoryFile {
  readonly body: Buffer;
  readonly mimeType: string;
  readonly originalName: string;
  readonly isPublic: boolean;
}

/**
 * `FileStorage` em memória para as rotas que consomem a porta: substitui o
 * disco sem mudar o contrato. Guarda o arquivo no `Map`, devolve a mesma
 * `StoredFile` do adapter e mantém `remove` idempotente e `open` inexistente
 * em `not_found`; validação de caminho fica no adapter, porque aqui não há
 * caminho.
 */
export class InMemoryFileStorage implements FileStorage {
  private readonly ids: IdGenerator;
  private readonly files = new Map<string, MemoryFile>();

  constructor(ids: IdGenerator) {
    this.ids = ids;
  }

  async save(input: SaveFileInput): Promise<StoredFile> {
    const extension = canonicalExtensionFor(input.mimeType);
    if (extension === null) {
      throw new AppError(
        "invalid_content_type",
        UNSUPPORTED_MEDIA_STATUS,
        UNSUPPORTED_FILE_TYPE_MESSAGE,
        {
          expose: true,
        },
      );
    }

    const body = await readAll(input.stream);
    const id = `${this.ids.next()}${extension}`;
    const isPublic = input.visibility === "public";
    this.files.set(id, {
      body,
      mimeType: input.mimeType,
      originalName: input.originalName,
      isPublic,
    });

    return {
      id,
      url: isPublic ? `${PUBLIC_UPLOADS_PATH}/${id}` : null,
      mimeType: input.mimeType,
      size: body.length,
      originalName: input.originalName,
    };
  }

  async open(id: string): Promise<Readable> {
    return Readable.from([this.find(id).body]);
  }

  async remove(id: string): Promise<void> {
    this.files.delete(id);
  }

  publicUrl(id: string): string {
    if (!this.find(id).isPublic) {
      throw notFound();
    }

    return `${PUBLIC_UPLOADS_PATH}/${id}`;
  }

  private find(id: string): MemoryFile {
    const file = this.files.get(id);
    if (file === undefined) {
      throw notFound();
    }

    return file;
  }
}

async function readAll(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function notFound(): AppError {
  return new AppError("not_found", 404, "Arquivo não encontrado.", { expose: true });
}
