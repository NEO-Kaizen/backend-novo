import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createOpenApiDocument } from "./openapi.ts";

/**
 * Escreve o artefato commitado. `import.meta.dirname` resolve o mesmo caminho
 * relativo a partir de `src/api-contract/` e de `dist/api-contract/`, então o
 * script roda no código-fonte e no build sem depender de `ts-node`.
 */
const OUTPUT_PATH = resolve(import.meta.dirname, "../../openapi/openapi.json");

async function main(): Promise<void> {
  const document = createOpenApiDocument();

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

await main();
