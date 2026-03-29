import type { NormalizedResource, ProjectConfig } from "../../types.js";
import { renderTemplate } from "../../utils/template.js";
import { createGeneratorContext } from "../shared.js";

export async function generateApiModule(
  config: ProjectConfig,
  resource: NormalizedResource,
  outputPath: string
): Promise<string> {
  return renderTemplate(`client/${config.reactStack}/api.hbs`, createGeneratorContext(config, resource), outputPath);
}
