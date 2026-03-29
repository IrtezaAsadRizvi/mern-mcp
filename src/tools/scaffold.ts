import { planScaffoldResource, persistScaffoldManifest } from "../planning/resourcePlanner.js";
import { scaffoldResourceSchema } from "../types.js";
import { writeArtifacts } from "../utils/files.js";
import { buildToolResponse } from "./common.js";

export async function scaffoldResource(projectRoot: string, rawInput: unknown) {
  const input = scaffoldResourceSchema.parse(rawInput);
  const plan = await planScaffoldResource(projectRoot, input);

  if (input.mode === "preview") {
    return buildToolResponse(plan);
  }

  if (!input.previewHash) {
    throw new Error("previewHash is required in apply mode");
  }

  if (input.previewHash !== plan.previewHash) {
    throw new Error("previewHash mismatch. Re-run preview before apply.");
  }

  if (plan.conflicts.length > 0 && input.conflictStrategy === "abort") {
    throw new Error("Apply blocked because unmanaged file conflicts were detected");
  }

  const writeResult = await writeArtifacts(plan.artifacts, input.conflictStrategy);
  const manifestPaths = plan.artifacts
    .filter((artifact) => artifact.kind !== "integration")
    .filter((artifact) => !(artifact.action === "update" && input.conflictStrategy === "skip"))
    .filter((artifact) => artifact.action !== "delete")
    .map((artifact) => artifact.path);

  await persistScaffoldManifest(projectRoot, plan, manifestPaths);
  return buildToolResponse(plan, writeResult);
}
