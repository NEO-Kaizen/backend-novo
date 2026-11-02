import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../../src/core/errors/app-error.ts";
import { PUBLIC_UPLOADS_PATH } from "../../src/core/storage/file-storage.ts";
import type { SaveFileInput, StoredFile } from "../../src/core/storage/file-storage.ts";
import { LocalFileStorage } from "../../src/platform/storage/local-file-storage.ts";
import {
  FIRST_SEQUENTIAL_ID,
  SequentialIdGenerator,
} from "../support/fakes/sequential-id-generator.ts";

const PDF_BYTES = Buffer.from("%PDF-1.7\n1 0 obj\n", "utf8");
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

describe("LocalFileStorage", () => {
  let directory: string;
  let storage: LocalFileStorage;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "neo-uploads-"));
    storage = new LocalFileStorage({ directory, ids: new SequentialIdGenerator() });
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  describe("save", () => {
    it("grava em public com UUID e extensão derivados do MIME, não do nome original", async () => {
      const stored = await saveFile(storage, {
        visibility: "public",
        mimeType: "image/jpeg",
        originalName: "foto.png",
        bytes: JPEG_BYTES,
      });

      expect(stored.id).toBe(`${FIRST_SEQUENTIAL_ID}.jpg`);
      expect(stored.url).toBe(`${PUBLIC_UPLOADS_PATH}/${stored.id}`);
      expect(stored.size).toBe(JPEG_BYTES.length);
      expect(stored.originalName).toBe("foto.png");
      await expect(readFile(join(directory, "public", stored.id))).resolves.toEqual(JPEG_BYTES);
    });

    it("grava private sem URL pública", async () => {
      const stored = await saveFile(storage, { visibility: "private" });

      expect(stored.url).toBeNull();
      await expect(readFile(join(directory, "private", stored.id))).resolves.toEqual(PDF_BYTES);
    });

    it("rejeita nome com separador de caminho, `..` ou byte nulo antes de gravar", async () => {
      for (const originalName of ["../evil.pdf", "sub/dir.pdf", "sub\\dir.pdf", "evil\0.pdf"]) {
        const error = await captureError(() => saveFile(storage, { originalName }));

        expect(error).toBeInstanceOf(AppError);
        expect(error).toMatchObject({ code: "validation_error", status: 400 });
      }

      await expect(readdir(directory)).resolves.toEqual([]);
    });

    it("rejeita MIME fora do catálogo com 415", async () => {
      const error = await captureError(() => saveFile(storage, { mimeType: "text/html" }));

      expect(error).toMatchObject({ code: "invalid_content_type", status: 415 });
    });

    it("não deixa arquivo quando o tamanho declarado não confere", async () => {
      const error = await captureError(() => saveFile(storage, { size: PDF_BYTES.length + 1 }));

      expect(error).toMatchObject({ code: "validation_error", status: 400 });
      await expect(readdir(join(directory, "private"))).resolves.toEqual([]);
    });

    it("não sobrescreve arquivo existente quando o id gerado se repete", async () => {
      const repeatingIds = { next: () => FIRST_SEQUENTIAL_ID };
      const fixedStorage = new LocalFileStorage({ directory, ids: repeatingIds });

      const first = await saveFile(fixedStorage);
      await expect(saveFile(fixedStorage, { bytes: JPEG_BYTES })).rejects.toThrow();

      await expect(readFile(join(directory, "private", first.id))).resolves.toEqual(PDF_BYTES);
    });
  });

  describe("open", () => {
    it("devolve o conteúdo gravado do arquivo privado", async () => {
      const stored = await saveFile(storage, { visibility: "private" });

      const stream = await storage.open(stored.id);
      await expect(readAll(stream)).resolves.toEqual(PDF_BYTES);
    });

    it("devolve not_found para id válido que não existe", async () => {
      const error = await captureError(() => storage.open(`${FIRST_SEQUENTIAL_ID}.pdf`));

      expect(error).toMatchObject({ code: "not_found", status: 404 });
    });

    it("rejeita id fora do padrão UUID + extensão", async () => {
      for (const id of ["../../etc/passwd", "..\\secret.pdf", `${FIRST_SEQUENTIAL_ID}.exe`, ""]) {
        const error = await captureError(() => storage.open(id));

        expect(error).toMatchObject({ code: "validation_error", status: 400 });
      }
    });
  });

  describe("remove", () => {
    it("é idempotente: remover duas vezes não é erro", async () => {
      const stored = await saveFile(storage, { visibility: "private" });

      await storage.remove(stored.id);
      await expect(storage.remove(stored.id)).resolves.toBeUndefined();
      await expect(storage.open(stored.id)).rejects.toMatchObject({ code: "not_found" });
    });

    it("rejeita id fora do padrão", async () => {
      const error = await captureError(() => storage.remove("../uploads/private/x.pdf"));

      expect(error).toMatchObject({ code: "validation_error", status: 400 });
    });
  });

  describe("publicUrl", () => {
    it("devolve a URL do arquivo público", async () => {
      const stored = await saveFile(storage, { visibility: "public" });

      expect(storage.publicUrl(stored.id)).toBe(`${PUBLIC_UPLOADS_PATH}/${stored.id}`);
    });

    it("não existe para arquivo privado", async () => {
      const stored = await saveFile(storage, { visibility: "private" });

      const error = await captureError(() => storage.publicUrl(stored.id));

      expect(error).toMatchObject({ code: "not_found", status: 404 });
    });
  });
});

interface SaveFileOverrides {
  readonly originalName?: string;
  readonly mimeType?: string;
  readonly size?: number;
  readonly visibility?: "public" | "private";
  readonly bytes?: Buffer;
}

function saveFile(
  storage: LocalFileStorage,
  overrides: SaveFileOverrides = {},
): Promise<StoredFile> {
  const bytes = overrides.bytes ?? PDF_BYTES;
  const input: SaveFileInput = {
    stream: Readable.from([bytes]),
    originalName: overrides.originalName ?? "contrato.pdf",
    mimeType: overrides.mimeType ?? "application/pdf",
    size: overrides.size ?? bytes.length,
    visibility: overrides.visibility ?? "private",
  };

  return storage.save(input);
}

async function readAll(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function captureError(action: () => Promise<unknown> | unknown): Promise<unknown> {
  try {
    await action();
  } catch (error) {
    return error;
  }

  throw new Error("esperava que a operação falhasse");
}
