import type { RequestHandler } from "express";
import multer from "multer";
import type { UploadConfig } from "../../core/config/config.ts";
import { AppError } from "../../core/errors/app-error.ts";

const MAX_PARTS = 20;
const MAX_FIELDS = 10;
const MAX_FIELD_BYTES = 2 * 1024 * 1024;

export interface UploadPolicy {
  /** Campos de arquivo que a rota aceita. */
  readonly fields: readonly multer.Field[];
  /** MIME types aceitos; qualquer outro vira 415. */
  readonly allowedMimeTypes: readonly string[];
}

/**
 * Multipart não é montado globalmente: parser, campos e política de MIME
 * pertencem à rota (anexos, avatar, assets). A factory aplica os limites da
 * config e exige a política da rota; limite total por requisição, quando
 * existir, é decisão da rota.
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
      fileSize: uploads.maxFileBytes,
      files: uploads.maxFiles,
      fields: MAX_FIELDS,
      parts: MAX_PARTS,
      fieldSize: MAX_FIELD_BYTES,
    },
    fileFilter: (_req, file, callback) => {
      if (!policy.allowedMimeTypes.includes(file.mimetype)) {
        callback(
          new AppError("invalid_content_type", 415, "Tipo de arquivo não permitido.", {
            expose: true,
          }),
        );
        return;
      }
      callback(null, true);
    },
  }).fields(policy.fields);
}
