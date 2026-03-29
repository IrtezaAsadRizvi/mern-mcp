import { existsSync, readFileSync } from "node:fs";

import type {
  FileArtifact,
  FileFingerprint,
  ProjectConfig,
  ScaffoldPlan
} from "../types.js";
import { normalizeField } from "../utils/fieldMapper.js";
import { sha256, stableStringify } from "../utils/hash.js";
import { buildResourceNames } from "../utils/naming.js";

export function createFingerprints(paths: string[]): FileFingerprint[] {
  return paths.map((item) => {
    const exists = existsSync(item);
    return {
      path: item,
      exists,
      contentHash: exists ? sha256(readFileSync(item, "utf8")) : null
    };
  });
}

export function createPreviewHash(input: {
  config: ProjectConfig;
  resource: unknown;
  artifacts: FileArtifact[];
  fingerprints: FileFingerprint[];
}): string {
  return sha256(stableStringify(input));
}

export function normalizeResourceInput(resourceName: string, description: string | undefined, fields: Parameters<typeof normalizeField>[0][]) {
  return {
    names: buildResourceNames(resourceName),
    description,
    fields: fields.map((field) => normalizeField(field))
  };
}

export function ensurePreviewHash(plan: Omit<ScaffoldPlan, "previewHash">): ScaffoldPlan {
  const previewHash = createPreviewHash({
    config: plan.config,
    resource: plan.resource,
    artifacts: plan.artifacts.map(({ content, existingContent, ...artifact }) => ({
      ...artifact,
      contentHash: content ? sha256(content) : null,
      existingContentHash: existingContent ? sha256(existingContent) : null
    })),
    fingerprints: plan.fingerprints
  });

  return {
    ...plan,
    previewHash
  };
}
