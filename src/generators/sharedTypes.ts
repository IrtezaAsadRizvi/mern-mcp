import type { NormalizedResource, ProjectConfig } from "../types.js";
import { renderTemplate } from "../utils/template.js";
import { createGeneratorContext } from "./shared.js";

export async function generateSharedTypes(
  config: ProjectConfig,
  resource: NormalizedResource,
  outputPath: string
): Promise<string> {
  return renderTemplate("client/shared-types.hbs", createGeneratorContext(config, resource), outputPath);
}
