import type { NormalizedResource, ProjectConfig } from "../../types.js";
import { renderTemplate } from "../../utils/template.js";
import { createGeneratorContext } from "../shared.js";

export async function generateDetailComponent(
  config: ProjectConfig,
  resource: NormalizedResource,
  outputPath: string
): Promise<string> {
  return renderTemplate("client/detail.hbs", createGeneratorContext(config, resource), outputPath);
}
