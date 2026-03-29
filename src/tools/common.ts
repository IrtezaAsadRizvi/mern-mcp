import path from "node:path";

import type {
  IntegrationAction,
  ScaffoldPlan,
  WriteResult
} from "../types.js";

function formatIntegrationActions(actions: IntegrationAction[]): string[] {
  return actions.map((action) =>
    action.relativePath ? `${action.description} (${action.relativePath})` : action.description
  );
}

export function resolveProjectRootFromProcess(argv: string[], cwd: string, env: NodeJS.ProcessEnv): string {
  const explicit = argv.find((argument) => argument.startsWith("--project-root="));

  if (explicit) {
    return path.resolve(cwd, explicit.slice("--project-root=".length));
  }

  const flagIndex = argv.findIndex((argument) => argument === "--project-root");
  if (flagIndex !== -1 && argv[flagIndex + 1]) {
    return path.resolve(cwd, argv[flagIndex + 1]!);
  }

  if (env.MERN_MCP_PROJECT_ROOT) {
    return path.resolve(cwd, env.MERN_MCP_PROJECT_ROOT);
  }

  return cwd;
}

export function summarizePlan(plan: ScaffoldPlan, writeResult?: WriteResult): string {
  const artifactCount = plan.artifacts.filter((artifact) => artifact.kind !== "integration").length;
  const conflictSummary =
    plan.conflicts.length > 0 ? `${plan.conflicts.length} conflict(s)` : "no conflicts";
  const writeSummary = writeResult
    ? ` Wrote ${writeResult.written.length}, skipped ${writeResult.skipped.length}, deleted ${writeResult.deleted.length}.`
    : "";

  return `${plan.resource.names.singularPascal}: ${artifactCount} generated artifact(s), ${conflictSummary}.${writeSummary}`;
}

export function buildPlanResult(plan: ScaffoldPlan, writeResult?: WriteResult) {
  return {
    mode: plan.mode,
    resourceName: plan.resource.names.singularPascal,
    normalizedResource: {
      resourceName: plan.resource.names.singularPascal,
      description: plan.resource.description ?? null,
      fields: plan.resource.fields.map((field) => ({
        name: field.name,
        key: field.key,
        type: field.type,
        required: field.required,
        isArray: field.isArray,
        ref: field.ref ?? null,
        enumValues: field.enumValues
      }))
    },
    previewHash: plan.previewHash,
    artifacts: plan.artifacts.map((artifact) => ({
      kind: artifact.kind,
      path: artifact.relativePath,
      action: artifact.action,
      reason: artifact.reason ?? null,
      content: artifact.content ?? null
    })),
    conflicts: plan.conflicts,
    integrationActions: plan.integrationActions,
    writeResult: writeResult ?? null,
    summary: summarizePlan(plan, writeResult),
    integrationSummary: formatIntegrationActions(plan.integrationActions)
  };
}

export function buildToolResponse(plan: ScaffoldPlan, writeResult?: WriteResult) {
  const structuredContent = buildPlanResult(plan, writeResult);
  return {
    content: [
      {
        type: "text" as const,
        text: structuredContent.summary
      }
    ],
    structuredContent
  };
}
