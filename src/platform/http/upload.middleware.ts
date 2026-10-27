import type { RequestHandler } from "express";
import multer from "multer";
import type { UploadConfig } from "../../core/config/config.ts";

/**
 * Multipart não é montado globalmente: parser, campos e política de MIME
 * pertencem à rota (anexos, avatar, assets). A factory aplica os limites da
 * config e exige a declaração dos campos aceitos.
 */
export function createUploadMiddleware(
  uploads: UploadConfig,
  fields: readonly multer.Field[],
): RequestHandler {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: uploads.maxFileBytes, files: uploads.maxFiles },
  }).fields(fields);
}
