import type { NormalizedResource, ProjectConfig } from "../../types.js";
import { renderTemplate } from "../../utils/template.js";
import { createGeneratorContext } from "../shared.js";

export async function generateFormComponent(
  config: ProjectConfig,
  resource: NormalizedResource,
  outputPath: string
): Promise<string> {
  return renderTemplate("client/form.hbs", createGeneratorContext(config, resource), outputPath);
}
