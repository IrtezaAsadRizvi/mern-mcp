import type { NormalizedResource, ProjectConfig } from "../types.js";
import { renderTemplate } from "../utils/template.js";
import { createGeneratorContext } from "./shared.js";

export async function generateValidator(
  config: ProjectConfig,
  resource: NormalizedResource,
  outputPath: string
): Promise<string> {
  return renderTemplate("server/validator.hbs", createGeneratorContext(config, resource), outputPath);
}
