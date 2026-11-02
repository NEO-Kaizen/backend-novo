import multer from "multer";
import { describe, expect, it } from "vitest";
import { AppError } from "../../src/core/errors/app-error.ts";
import { assertContentSignature } from "../../src/core/storage/content-signature.ts";
import { toHttpAppError } from "../../src/platform/http/transport-error-mapper.ts";

describe("toHttpAppError no upload", () => {
  it("mapeia o limite de tamanho do multer para 413", () => {
    const error = toHttpAppError(new multer.MulterError("LIMIT_FILE_SIZE", "attachments"));

    expect(error).toMatchObject({ code: "payload_too_large", status: 413, expose: true });
  });

  it("mapeia arquivo inesperado ou acima da contagem para 400", () => {
    for (const code of ["LIMIT_FILE_COUNT", "LIMIT_UNEXPECTED_FILE"] as const) {
      const error = toHttpAppError(new multer.MulterError(code, "attachments"));

      expect(error).toMatchObject({ code: "validation_error", status: 400 });
    }
  });

  it("preserva o 415 do MIME ou do conteúdo divergente", () => {
    const cause = captureError(() =>
      assertContentSignature("application/pdf", Buffer.from("<html></html>", "utf8")),
    );
    const error = toHttpAppError(cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: "invalid_content_type", status: 415 });
  });

  it("preserva o 400 de campo ou entrada inválida", () => {
    const cause = new AppError("validation_error", 400, "Campo obrigatório ausente.", {
      expose: true,
    });
    const error = toHttpAppError(cause);

    expect(error).toBe(cause);
    expect(error).toMatchObject({ code: "validation_error", status: 400 });
  });
});

function captureError(action: () => void): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }

  throw new Error("esperava que a validação falhasse");
}
