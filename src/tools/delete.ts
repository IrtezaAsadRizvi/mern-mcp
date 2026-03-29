import { persistDeleteManifest, planDeleteResource } from "../planning/resourcePlanner.js";
import { deleteResourceSchema } from "../types.js";
import { writeArtifacts } from "../utils/files.js";
import { buildToolResponse } from "./common.js";

export async function deleteResource(projectRoot: string, rawInput: unknown) {
  const input = deleteResourceSchema.parse(rawInput);
  const plan = await planDeleteResource(projectRoot, input);

  if (input.mode === "preview") {
    return buildToolResponse(plan);
  }

  if (!input.previewHash) {
    throw new Error("previewHash is required in apply mode");
  }

  if (input.previewHash !== plan.previewHash) {
    throw new Error("previewHash mismatch. Re-run preview before apply.");
  }

  const writeResult = await writeArtifacts(plan.artifacts, input.conflictStrategy);
  await persistDeleteManifest(projectRoot, plan.resource.names.singularPascal);

  return buildToolResponse(plan, writeResult);
}
