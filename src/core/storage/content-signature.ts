import { AppError } from "../errors/app-error.ts";
import { UNSUPPORTED_MEDIA_STATUS } from "../http/error-envelope.ts";
import { UNSUPPORTED_FILE_TYPE_MESSAGE } from "./file-types.ts";

/**
 * Janela de inspeção do início do arquivo. Assinatura é prefixo; 1 KiB cobre
 * o prolog do XML e os cabeçalhos de container sem ler o arquivo inteiro.
 */
const SIGNATURE_PROBE_BYTES = 1024;

const CONTENT_MISMATCH_MESSAGE = "Conteúdo do arquivo não corresponde ao tipo declarado.";

interface ContentSignature {
  /** MIME types que a assinatura satisfaz; a rota declara um deles. */
  readonly mimeTypes: readonly string[];
  readonly matches: (bytes: Uint8Array) => boolean;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const ICO_MAGIC = [0x00, 0x00, 0x01, 0x00];
// OOXML (docx/xlsx) é um container ZIP: distinguir os dois exigiria abrir as
// partes do pacote, o que está fora do escopo da v1. A assinatura prova que o
// conteúdo é o container; o MIME declarado prova qual variante ele é.
const ZIP_MAGIC = [0x50, 0x4b];
const ZIP_MEMBERS = [0x03, 0x04];
const ZIP_EMPTY = [0x05, 0x06];
const ZIP_SPANNED = [0x07, 0x08];
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50]; // "WEBP", no offset 8

const SIGNATURES: readonly ContentSignature[] = [
  { mimeTypes: ["application/pdf"], matches: (bytes) => startsWith(bytes, PDF_MAGIC) },
  { mimeTypes: ["image/png"], matches: (bytes) => startsWith(bytes, PNG_MAGIC) },
  { mimeTypes: ["image/jpeg"], matches: (bytes) => startsWith(bytes, JPEG_MAGIC) },
  {
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    matches: (bytes) =>
      startsWith(bytes, ZIP_MAGIC, 0) &&
      (startsWith(bytes, ZIP_MEMBERS, 2) ||
        startsWith(bytes, ZIP_EMPTY, 2) ||
        startsWith(bytes, ZIP_SPANNED, 2)),
  },
  {
    mimeTypes: ["image/x-icon", "image/vnd.microsoft.icon"],
    matches: (bytes) => startsWith(bytes, ICO_MAGIC),
  },
  {
    mimeTypes: ["image/webp"],
    matches: (bytes) => startsWith(bytes, RIFF_MAGIC) && startsWith(bytes, WEBP_MAGIC, 8),
  },
  { mimeTypes: ["image/svg+xml"], matches: matchesSvgText },
];

const signatureByMimeType = new Map<string, ContentSignature>();
for (const signature of SIGNATURES) {
  for (const mimeType of signature.mimeTypes) {
    signatureByMimeType.set(mimeType, signature);
  }
}

/**
 * Valida o conteúdo pelos magic bytes, além do MIME declarado pelo cliente:
 * `Content-Type` e extensão são declaração, não garantia. A política da rota
 * decide quais MIME types são aceitos; aqui só se prova que o byte inicial
 * corresponde ao tipo declarado.
 *
 * MIME fora do catálogo e conteúdo divergente devolvem `415`, porque o tipo
 * efetivo não é permitido (§9 de `04-API-Conventions.md`).
 */
export function assertContentSignature(declaredMimeType: string, bytes: Uint8Array): void {
  const signature = signatureByMimeType.get(declaredMimeType.toLowerCase());
  if (signature === undefined) {
    throw unsupportedContentType(UNSUPPORTED_FILE_TYPE_MESSAGE);
  }

  if (!signature.matches(bytes.subarray(0, SIGNATURE_PROBE_BYTES))) {
    throw unsupportedContentType(CONTENT_MISMATCH_MESSAGE);
  }
}

function startsWith(bytes: Uint8Array, prefix: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + prefix.length) {
    return false;
  }

  return prefix.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * SVG é texto: não há magic bytes. O prolog XML é opcional, então a asserção
 * é o prefixo do documento (`<svg`) ou um `<?xml` que declare `<svg` na janela
 * de inspeção — sonda de assinatura, não parser.
 */
function matchesSvgText(bytes: Uint8Array): boolean {
  const head = new TextDecoder("utf-8").decode(bytes).trimStart();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}

function unsupportedContentType(message: string): AppError {
  return new AppError("invalid_content_type", UNSUPPORTED_MEDIA_STATUS, message, { expose: true });
}
