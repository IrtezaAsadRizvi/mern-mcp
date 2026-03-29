import { listResources } from "../planning/resourcePlanner.js";
import { listResourcesSchema } from "../types.js";

export async function listProjectResources(projectRoot: string, rawInput: unknown) {
  const input = listResourcesSchema.parse(rawInput ?? {});
  const resources = await listResources(projectRoot, input.includeUnmanaged);
  return {
    content: [
      {
        type: "text" as const,
        text: `Found ${resources.length} resource record(s).`
      }
    ],
    structuredContent: {
      resources
    }
  };
}
