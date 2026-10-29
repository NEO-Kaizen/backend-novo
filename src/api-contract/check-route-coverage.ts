import { createApp } from "../app.ts";
import { createContainer } from "../container.ts";
import { loadConfig } from "../platform/config/load-config.ts";
import { createOpenApiDocument } from "./openapi.ts";
import { assertRouteCoverage } from "./route-coverage.ts";

/** Cobre o app real contra o documento gerado, como o CI vai cobrar cada domínio. */
export async function checkRouteCoverage(environment: NodeJS.ProcessEnv): Promise<void> {
  const container = createContainer(loadConfig(environment));

  try {
    assertRouteCoverage(createApp(container), createOpenApiDocument());
  } finally {
    await container.database.destroy();
  }
}
