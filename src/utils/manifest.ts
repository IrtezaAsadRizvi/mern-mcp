import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ManifestFile, ManifestResourceRecord, NormalizedResource, ProjectConfig } from "../types.js";
import { manifestFileName, manifestSchema } from "../types.js";

function getManifestPath(projectRoot: string): string {
  return path.join(projectRoot, manifestFileName);
}

export async function loadManifest(projectRoot: string): Promise<ManifestFile> {
  try {
    const raw = await readFile(getManifestPath(projectRoot), "utf8");
    return manifestSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        version: 1,
        resources: []
      };
    }

    throw error;
  }
}

export async function saveManifest(projectRoot: string, manifest: ManifestFile): Promise<void> {
  await writeFile(getManifestPath(projectRoot), JSON.stringify(manifest, null, 2), "utf8");
}

export function upsertManifestResource(
  manifest: ManifestFile,
  resource: NormalizedResource,
  config: ProjectConfig,
  paths: string[]
): ManifestFile {
  const nextRecord: ManifestResourceRecord = {
    resourceName: resource.names.singularPascal,
    description: resource.description,
    fields: resource.fields.map((field) => ({
      name: field.name,
      type: field.type,
      required: field.required,
      isArray: field.isArray,
      enumValues: field.enumValues,
      ref: field.ref,
      defaultValue: field.defaultValue,
      unique: field.unique,
      indexed: field.indexed,
      uiLabel: field.uiLabel,
      uiWidget: field.uiWidget
    })),
    paths,
    language: config.language,
    reactStack: config.reactStack,
    validation: config.validation,
    auth: config.auth,
    updatedAt: new Date().toISOString()
  };

  const resources = manifest.resources.filter(
    (record) => record.resourceName !== resource.names.singularPascal
  );
  resources.push(nextRecord);

  return {
    ...manifest,
    resources
  };
}

export function removeManifestResource(manifest: ManifestFile, resourceName: string): ManifestFile {
  return {
    ...manifest,
    resources: manifest.resources.filter((record) => record.resourceName !== resourceName)
  };
}

export function findManifestResource(manifest: ManifestFile, resourceName: string): ManifestResourceRecord | undefined {
  return manifest.resources.find((record) => record.resourceName === resourceName);
}
