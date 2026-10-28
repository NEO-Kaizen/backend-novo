import { extname } from "node:path";
import type { RequestHandler } from "express";
import multer from "multer";
import { MEBIBYTE } from "../../core/config/config.ts";
import type { UploadConfig } from "../../core/config/config.ts";
import { AppError } from "../../core/errors/app-error.ts";

const MAX_PARTS = 20;
const MAX_FIELDS = 10;
const MAX_FIELD_BYTES = 2 * MEBIBYTE;
const UNSUPPORTED_MEDIA_STATUS = 415;

export interface UploadPolicy {
  /** Campos de arquivo que a rota aceita. */
  readonly fields: readonly multer.Field[];
  /** MIME types aceitos; qualquer outro vira 415. */
  readonly allowedMimeTypes: readonly string[];
  /** Sobrescreve `UPLOAD_MAX_FILE_BYTES` para a rota (ex.: avatar 2 MiB). */
  readonly maxFileBytes?: number;
  /** Sobrescreve `UPLOAD_MAX_FILES` para a rota (ex.: avatar 1 arquivo). */
  readonly maxFiles?: number;
}

/**
 * Multipart não é montado globalmente: parser, campos e política de MIME
 * pertencem à rota (anexos, avatar, assets). A config global traz os defaults
 * e a rota sobrescreve tamanho e quantidade quando §9 exigir.
 *
 * O total de arquivos não é validado como limite único (§9): o 413 vem do
 * arquivo ou da parte JSON que exceder o próprio limite.
 *
 * O MIME é o declarado pelo cliente; conferir o conteúdo fica para a rota.
 */
export function createUploadMiddleware(
  uploads: UploadConfig,
  policy: UploadPolicy,
): RequestHandler {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: policy.maxFileBytes ?? uploads.maxFileBytes,
      files: policy.maxFiles ?? uploads.maxFiles,
      fields: MAX_FIELDS,
      parts: MAX_PARTS,
      fieldSize: MAX_FIELD_BYTES,
    },
    fileFilter: (_req, file, callback) => {
      if (!policy.allowedMimeTypes.includes(file.mimetype)) {
        callback(
          new AppError(
            "invalid_content_type",
            UNSUPPORTED_MEDIA_STATUS,
            "Tipo de arquivo não permitido.",
            { expose: true },
          ),
        );
        return;
      }
      callback(null, true);
    },
  }).fields(policy.fields);
}
