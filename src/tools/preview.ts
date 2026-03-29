import { scaffoldResourceSchema } from "../types.js";
import { planScaffoldResource } from "../planning/resourcePlanner.js";
import { buildToolResponse } from "./common.js";

export async function previewScaffold(projectRoot: string, rawInput: unknown) {
  const input = scaffoldResourceSchema.parse({
    ...(rawInput as Record<string, unknown>),
    mode: "preview"
  });
  const plan = await planScaffoldResource(projectRoot, input);
  return buildToolResponse(plan);
}
