import { describe, expect, it } from "vitest";
import { AppError } from "../../src/core/errors/app-error.ts";
import { assertContentSignature } from "../../src/core/storage/content-signature.ts";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ZIP_HEADER = [0x50, 0x4b, 0x03, 0x04];
const PDF_BYTES = Buffer.from("%PDF-1.7\n", "utf8");
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const ICO_BYTES = Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01]);
const ZIP_BYTES = Buffer.from([...ZIP_HEADER, 0x14, 0x00]);
const WEBP_BYTES = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const SVG_BYTES = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "utf8");
const SVG_WITH_PROLOG_BYTES = Buffer.from(
  '<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg"></svg>',
  "utf8",
);

const ACCEPTED_SAMPLES: ReadonlyArray<readonly [string, Buffer]> = [
  ["application/pdf", PDF_BYTES],
  ["image/png", PNG_BYTES],
  ["image/jpeg", JPEG_BYTES],
  [DOCX_MIME, ZIP_BYTES],
  [XLSX_MIME, ZIP_BYTES],
  ["image/x-icon", ICO_BYTES],
  ["image/vnd.microsoft.icon", ICO_BYTES],
  ["image/webp", WEBP_BYTES],
  ["image/svg+xml", SVG_BYTES],
  ["image/svg+xml", SVG_WITH_PROLOG_BYTES],
];

describe("assertContentSignature", () => {
  it("aceita conteúdo com a assinatura do tipo declarado", () => {
    for (const [mimeType, bytes] of ACCEPTED_SAMPLES) {
      expect(() => assertContentSignature(mimeType, bytes)).not.toThrow();
    }
  });

  it("rejeita conteúdo que não corresponde ao MIME declarado", () => {
    const error = captureError(() => assertContentSignature("application/pdf", PNG_BYTES));

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: "invalid_content_type",
      status: 415,
      message: "Conteúdo do arquivo não corresponde ao tipo declarado.",
    });
  });

  it("rejeita HTML disfarçado de SVG", () => {
    const error = captureError(() =>
      assertContentSignature("image/svg+xml", Buffer.from("<html><body>x</body></html>", "utf8")),
    );

    expect(error).toMatchObject({ code: "invalid_content_type", status: 415 });
  });

  it("rejeita tipo fora do catálogo sem inspecionar o conteúdo", () => {
    const error = captureError(() => assertContentSignature("text/html", Buffer.from("<p>x</p>")));

    expect(error).toMatchObject({
      code: "invalid_content_type",
      status: 415,
      message: "Tipo de arquivo não permitido.",
    });
  });

  it("rejeita arquivo vazio mesmo com MIME aceito", () => {
    const error = captureError(() => assertContentSignature("application/pdf", Buffer.alloc(0)));

    expect(error).toMatchObject({ code: "invalid_content_type", status: 415 });
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
