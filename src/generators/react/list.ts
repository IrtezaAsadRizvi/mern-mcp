import type { NormalizedResource, ProjectConfig } from "../../types.js";
import { renderTemplate } from "../../utils/template.js";
import { createGeneratorContext } from "../shared.js";

export async function generateListComponent(
  config: ProjectConfig,
  resource: NormalizedResource,
  outputPath: string
): Promise<string> {
  return renderTemplate("client/list.hbs", createGeneratorContext(config, resource), outputPath);
}
