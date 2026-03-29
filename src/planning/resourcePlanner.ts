import { existsSync } from "node:fs";
import path from "node:path";

import fg from "fast-glob";

import { generateResourceFiles } from "../generators/index.js";
import {
  patchClientRouter,
  patchReduxStore,
  patchServerMount,
  unpatchReduxStore,
  unpatchServerMount
} from "../integrations/patchers.js";
import type {
  AddFieldInput,
  ConflictRecord,
  DeleteResourceInput,
  FileArtifact,
  IntegrationAction,
  ManifestResourceRecord,
  NormalizedResource,
  ProjectConfig,
  ProjectOverrides,
  ResolvedPaths,
  ScaffoldPlan,
  ScaffoldResourceInput
} from "../types.js";
import { resolvePaths, loadProjectConfig } from "../utils/config.js";
import { parseDescriptionToFields } from "../utils/description.js";
import { readTextIfExists } from "../utils/files.js";
import {
  findManifestResource,
  loadManifest,
  removeManifestResource,
  saveManifest,
  upsertManifestResource
} from "../utils/manifest.js";
import { resolveResourceArtifactPaths, toArtifactLocation } from "./pathResolver.js";
import { createFingerprints, ensurePreviewHash, normalizeResourceInput } from "./planner.js";

const serverEntryCandidates = [
  "index.ts",
  "index.js",
  "app.ts",
  "app.js",
  "server.ts",
  "server.js",
  "src/index.ts",
  "src/index.js",
  "src/app.ts",
  "src/app.js",
  "src/server.ts",
  "src/server.js"
];

const clientRouterCandidates = [
  "router.tsx",
  "router.jsx",
  "App.tsx",
  "App.jsx",
  "app.tsx",
  "app.jsx",
  "src/router.tsx",
  "src/router.jsx",
  "src/App.tsx",
  "src/App.jsx",
  "src/app.tsx",
  "src/app.jsx"
];

const clientStoreCandidates = ["store.ts", "store.js", "src/store.ts", "src/store.js"];

function mergeConfig(base: ProjectConfig, overrides: ProjectOverrides | undefined): ProjectConfig {
  if (!overrides) {
    return base;
  }

  return {
    ...base,
    ...overrides
  };
}

function getManagedPaths(record: ManifestResourceRecord | undefined): Set<string> {
  return new Set(record?.paths ?? []);
}

async function detectPath(
  root: string,
  explicitPath: string | undefined,
  candidates: string[]
): Promise<string | undefined> {
  if (explicitPath) {
    return explicitPath;
  }

  for (const candidate of candidates) {
    const absolutePath = path.resolve(root, candidate);
    if (existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  return undefined;
}

function buildDependencyActions(config: ProjectConfig): IntegrationAction[] {
  const packages = new Set<string>(["express", "mongoose"]);

  if (config.validation === "zod" || config.validation === "both") {
    packages.add("zod");
  }

  if (config.validation === "express-validator" || config.validation === "both") {
    packages.add("express-validator");
  }

  if (config.auth === "jwt") {
    packages.add("jsonwebtoken");
  }

  if (config.reactStack === "react-query") {
    packages.add("@tanstack/react-query");
  }

  if (config.reactStack === "redux") {
    packages.add("@reduxjs/toolkit");
    packages.add("react-redux");
  }

  if (config.reactStack === "axios") {
    packages.add("axios");
  }

  return [
    {
      kind: "manual",
      description: `Ensure target project dependencies include: ${Array.from(packages).sort().join(", ")}`,
      applied: false
    }
  ];
}

async function createContentArtifact(params: {
  projectRoot: string;
  kind: string;
  targetPath: string;
  nextContent: string;
  managedPaths: Set<string>;
  conflicts: ConflictRecord[];
}): Promise<FileArtifact> {
  const existingContent = await readTextIfExists(params.targetPath);
  const location = toArtifactLocation(params.projectRoot, params.targetPath);

  if (existingContent === undefined) {
    return {
      kind: params.kind,
      action: "create",
      content: params.nextContent,
      ...location
    };
  }

  if (existingContent === params.nextContent) {
    return {
      kind: params.kind,
      action: "skip",
      content: params.nextContent,
      existingContent,
      reason: "No changes detected",
      ...location
    };
  }

  if (!params.managedPaths.has(params.targetPath) && params.kind !== "integration") {
    params.conflicts.push({
      path: params.targetPath,
      relativePath: location.relativePath,
      action: "update",
      reason: "Existing unmanaged file would be overwritten"
    });
  }

  return {
    kind: params.kind,
    action: "update",
    content: params.nextContent,
    existingContent,
    ...location
  };
}

async function planIntegrations(params: {
  projectRoot: string;
  config: ProjectConfig;
  resolvedPaths: ResolvedPaths;
  resource: NormalizedResource;
  routePath: string;
  apiPath: string;
  formPath: string;
  listPath: string;
  detailPath: string;
}): Promise<{ artifacts: FileArtifact[]; actions: IntegrationAction[] }> {
  const actions: IntegrationAction[] = [...buildDependencyActions(params.config)];
  const artifacts: FileArtifact[] = [];

  const serverEntry = await detectPath(
    params.resolvedPaths.serverRoot,
    params.resolvedPaths.serverEntry,
    serverEntryCandidates
  );

  if (serverEntry) {
    const content = await readTextIfExists(serverEntry);

    if (content) {
      const patched = patchServerMount({
        content,
        filePath: serverEntry,
        routeFilePath: params.routePath,
        routeIdentifier: `${params.resource.names.singularCamel}Routes`,
        mountPath: `/api/${params.resource.names.pluralKebab}`
      });

      if (patched.applied && patched.content !== content) {
        artifacts.push({
          kind: "integration",
          action: "update",
          content: patched.content,
          existingContent: content,
          ...toArtifactLocation(params.projectRoot, serverEntry)
        });
        actions.push({
          kind: "patch",
          path: serverEntry,
          relativePath: path.relative(params.projectRoot, serverEntry),
          description: `Mount ${params.resource.names.singularPascal} routes in server entry`,
          applied: true
        });
      }
    }
  } else {
    actions.push({
      kind: "manual",
      description: `No server entrypoint detected. Mount ${params.resource.names.singularKebab}.routes manually.`,
      applied: false
    });
  }

  const clientRouter = await detectPath(
    params.resolvedPaths.clientRoot,
    params.resolvedPaths.clientRouter,
    clientRouterCandidates
  );

  if (clientRouter) {
    const content = await readTextIfExists(clientRouter);

    if (content) {
      const patched = patchClientRouter({
        content,
        filePath: clientRouter,
        listComponentPath: params.listPath,
        formComponentPath: params.formPath,
        detailComponentPath: params.detailPath,
        names: {
          singularPascal: params.resource.names.singularPascal,
          pluralKebab: params.resource.names.pluralKebab
        }
      });

      if (patched.applied && patched.content !== content) {
        artifacts.push({
          kind: "integration",
          action: "update",
          content: patched.content,
          existingContent: content,
          ...toArtifactLocation(params.projectRoot, clientRouter)
        });
        actions.push({
          kind: "patch",
          path: clientRouter,
          relativePath: path.relative(params.projectRoot, clientRouter),
          description: `Register ${params.resource.names.singularPascal} routes in client router`,
          applied: true
        });
      } else {
        actions.push({
          kind: "manual",
          description: `Client router exists but no supported createBrowserRouter pattern was detected for ${params.resource.names.singularPascal}.`,
          applied: false
        });
      }
    }
  }

  if (params.config.reactStack === "redux") {
    const storePath = await detectPath(
      params.resolvedPaths.clientRoot,
      params.resolvedPaths.clientStore,
      clientStoreCandidates
    );

    if (storePath) {
      const content = await readTextIfExists(storePath);

      if (content) {
        const patched = patchReduxStore({
          content,
          filePath: storePath,
          apiFilePath: params.apiPath,
          reducerIdentifier: `${params.resource.names.singularCamel}Reducer`,
          keyIdentifier: `${params.resource.names.singularCamel}StoreKey`
        });

        if (patched.applied && patched.content !== content) {
          artifacts.push({
            kind: "integration",
            action: "update",
            content: patched.content,
            existingContent: content,
            ...toArtifactLocation(params.projectRoot, storePath)
          });
          actions.push({
            kind: "patch",
            path: storePath,
            relativePath: path.relative(params.projectRoot, storePath),
            description: `Register ${params.resource.names.singularPascal} reducer in Redux store`,
            applied: true
          });
        } else {
          actions.push({
            kind: "manual",
            description: `Redux store exists but no supported configureStore reducer object was detected for ${params.resource.names.singularPascal}.`,
            applied: false
          });
        }
      }
    } else {
      actions.push({
        kind: "manual",
        description: `No Redux store file detected. Register ${params.resource.names.singularCamel}Reducer manually.`,
        applied: false
      });
    }
  }

  if (params.config.reactStack === "react-query") {
    actions.push({
      kind: "manual",
      description: "Ensure the client app is wrapped with QueryClientProvider before using the generated React Query hook.",
      applied: false
    });
  }

  return {
    artifacts,
    actions
  };
}

function collectPaths(artifacts: FileArtifact[]): string[] {
  return artifacts
    .filter((artifact) => artifact.action !== "skip")
    .map((artifact) => artifact.path);
}

export async function planScaffoldResource(
  projectRoot: string,
  input: ScaffoldResourceInput
): Promise<ScaffoldPlan> {
  const baseConfig = loadProjectConfig(projectRoot);
  const manifest = await loadManifest(projectRoot);
  const config = mergeConfig(baseConfig, input.overrides);
  const manifestRecord = findManifestResource(manifest, normalizeResourceInput(input.resourceName, undefined, []).names.singularPascal);
  const fields = input.fields ?? parseDescriptionToFields(input.description ?? "");
  const resource = normalizeResourceInput(input.resourceName, input.description, fields);
  const resolvedPaths = resolvePaths(projectRoot, config);
  const artifactPaths = resolveResourceArtifactPaths(resolvedPaths, config, resource.names);
  const generated = await generateResourceFiles(config, resource, artifactPaths);
  const conflicts: ConflictRecord[] = [];
  const managedPaths = getManagedPaths(manifestRecord);
  const artifacts: FileArtifact[] = [];

  artifacts.push(
    await createContentArtifact({
      projectRoot,
      kind: "model",
      targetPath: artifactPaths.modelPath,
      nextContent: generated.model,
      managedPaths,
      conflicts
    }),
    await createContentArtifact({
      projectRoot,
      kind: "service",
      targetPath: artifactPaths.servicePath,
      nextContent: generated.service,
      managedPaths,
      conflicts
    }),
    await createContentArtifact({
      projectRoot,
      kind: "controller",
      targetPath: artifactPaths.controllerPath,
      nextContent: generated.controller,
      managedPaths,
      conflicts
    }),
    await createContentArtifact({
      projectRoot,
      kind: "route",
      targetPath: artifactPaths.routePath,
      nextContent: generated.routes,
      managedPaths,
      conflicts
    }),
    await createContentArtifact({
      projectRoot,
      kind: "types",
      targetPath: artifactPaths.typesPath,
      nextContent: generated.sharedTypes,
      managedPaths,
      conflicts
    }),
    await createContentArtifact({
      projectRoot,
      kind: "api",
      targetPath: artifactPaths.apiPath,
      nextContent: generated.api,
      managedPaths,
      conflicts
    }),
    await createContentArtifact({
      projectRoot,
      kind: "hook",
      targetPath: artifactPaths.hookPath,
      nextContent: generated.hook,
      managedPaths,
      conflicts
    }),
    await createContentArtifact({
      projectRoot,
      kind: "form",
      targetPath: artifactPaths.formPath,
      nextContent: generated.form,
      managedPaths,
      conflicts
    }),
    await createContentArtifact({
      projectRoot,
      kind: "list",
      targetPath: artifactPaths.listPath,
      nextContent: generated.list,
      managedPaths,
      conflicts
    }),
    await createContentArtifact({
      projectRoot,
      kind: "detail",
      targetPath: artifactPaths.detailPath,
      nextContent: generated.detail,
      managedPaths,
      conflicts
    })
  );

  if (artifactPaths.validatorPath && generated.validator) {
    artifacts.push(
      await createContentArtifact({
        projectRoot,
        kind: "validator",
        targetPath: artifactPaths.validatorPath,
        nextContent: generated.validator,
        managedPaths,
        conflicts
      })
    );
  }

  if (artifactPaths.authMiddlewarePath && generated.authMiddleware) {
    artifacts.push(
      await createContentArtifact({
        projectRoot,
        kind: "middleware",
        targetPath: artifactPaths.authMiddlewarePath,
        nextContent: generated.authMiddleware,
        managedPaths,
        conflicts
      })
    );
  }

  const integrations = await planIntegrations({
    projectRoot,
    config,
    resolvedPaths,
    resource,
    routePath: artifactPaths.routePath,
    apiPath: artifactPaths.apiPath,
    formPath: artifactPaths.formPath,
    listPath: artifactPaths.listPath,
    detailPath: artifactPaths.detailPath
  });

  artifacts.push(...integrations.artifacts);

  const fingerprints = createFingerprints(Array.from(new Set(collectPaths(artifacts))));

  return ensurePreviewHash({
    mode: input.mode,
    config,
    resource,
    paths: resolvedPaths,
    artifacts,
    conflicts,
    integrationActions: integrations.actions,
    fingerprints
  });
}

export async function applyScaffoldPlan(
  plan: ScaffoldPlan,
  conflictStrategy: ScaffoldResourceInput["conflictStrategy"]
): Promise<{ plan: ScaffoldPlan; manifestPaths: string[] }> {
  if (plan.conflicts.length > 0 && conflictStrategy === "abort") {
    throw new Error("Apply blocked because unmanaged file conflicts were detected");
  }

  const manifestPaths = plan.artifacts
    .filter((artifact) => artifact.kind !== "integration" && artifact.action !== "skip")
    .map((artifact) => artifact.path);

  return {
    plan,
    manifestPaths
  };
}

export async function persistScaffoldManifest(
  projectRoot: string,
  plan: ScaffoldPlan,
  manifestPaths: string[]
): Promise<void> {
  const manifest = await loadManifest(projectRoot);
  const nextManifest = upsertManifestResource(manifest, plan.resource, plan.config, manifestPaths);
  await saveManifest(projectRoot, nextManifest);
}

export async function planAddField(projectRoot: string, input: AddFieldInput): Promise<ScaffoldPlan> {
  const manifest = await loadManifest(projectRoot);
  const record = findManifestResource(manifest, normalizeResourceInput(input.resourceName, undefined, []).names.singularPascal);

  if (!record) {
    throw new Error(`Resource ${input.resourceName} was not found in the manifest`);
  }

  const existingFields = [...record.fields];
  if (existingFields.some((field) => field.name === input.field.name)) {
    throw new Error(`Field ${input.field.name} already exists on ${input.resourceName}`);
  }

  return planScaffoldResource(projectRoot, {
    resourceName: record.resourceName,
    description: record.description,
    fields: [...existingFields, input.field],
    mode: input.mode,
    previewHash: input.previewHash,
    conflictStrategy: input.conflictStrategy
  });
}

export async function planDeleteResource(projectRoot: string, input: DeleteResourceInput): Promise<ScaffoldPlan> {
  const baseConfig = loadProjectConfig(projectRoot);
  const manifest = await loadManifest(projectRoot);
  const record = findManifestResource(manifest, normalizeResourceInput(input.resourceName, undefined, []).names.singularPascal);

  if (!record) {
    throw new Error(`Resource ${input.resourceName} was not found in the manifest`);
  }

  const config = mergeConfig(baseConfig, undefined);
  const resolvedPaths = resolvePaths(projectRoot, config);
  const resource = normalizeResourceInput(record.resourceName, record.description, record.fields);
  const artifacts: FileArtifact[] = [];

  for (const filePath of record.paths) {
    artifacts.push({
      kind: "generated",
      action: "delete",
      ...toArtifactLocation(projectRoot, filePath)
    });
  }

  const integrationActions: IntegrationAction[] = [];

  const serverEntry = await detectPath(
    resolvedPaths.serverRoot,
    resolvedPaths.serverEntry,
    serverEntryCandidates
  );

  if (serverEntry) {
    const content = await readTextIfExists(serverEntry);

    if (content) {
      const patched = unpatchServerMount({
        content,
        filePath: serverEntry,
        routeFilePath: path.join(resolvedPaths.routesDir, `${resource.names.singularKebab}.routes.${config.language === "typescript" ? "ts" : "js"}`),
        routeIdentifier: `${resource.names.singularCamel}Routes`,
        mountPath: `/api/${resource.names.pluralKebab}`
      });

      if (patched.content !== content) {
        artifacts.push({
          kind: "integration",
          action: "update",
          content: patched.content,
          existingContent: content,
          ...toArtifactLocation(projectRoot, serverEntry)
        });
        integrationActions.push({
          kind: "patch",
          path: serverEntry,
          relativePath: path.relative(projectRoot, serverEntry),
          description: `Remove ${resource.names.singularPascal} route mount from server entry`,
          applied: true
        });
      }
    }
  }

  if (record.reactStack === "redux") {
    const storePath = await detectPath(
      resolvedPaths.clientRoot,
      resolvedPaths.clientStore,
      clientStoreCandidates
    );

    if (storePath) {
      const content = await readTextIfExists(storePath);

      if (content) {
        const apiPath = path.join(
          resolvedPaths.apiDir,
          `${resource.names.singularKebab}.api.${record.language === "typescript" ? "ts" : "js"}`
        );
        const patched = unpatchReduxStore({
          content,
          filePath: storePath,
          apiFilePath: apiPath,
          reducerIdentifier: `${resource.names.singularCamel}Reducer`,
          keyIdentifier: `${resource.names.singularCamel}StoreKey`
        });

        if (patched.content !== content) {
          artifacts.push({
            kind: "integration",
            action: "update",
            content: patched.content,
            existingContent: content,
            ...toArtifactLocation(projectRoot, storePath)
          });
          integrationActions.push({
            kind: "patch",
            path: storePath,
            relativePath: path.relative(projectRoot, storePath),
            description: `Remove ${resource.names.singularPascal} reducer from Redux store`,
            applied: true
          });
        }
      }
    }
  }

  integrationActions.push({
    kind: "manual",
    description: `Review client routes and any hand-written imports for ${resource.names.singularPascal} before deleting the generated files.`,
    applied: false
  });

  const fingerprints = createFingerprints(Array.from(new Set(collectPaths(artifacts))));

  return ensurePreviewHash({
    mode: input.mode,
    config,
    resource,
    paths: resolvedPaths,
    artifacts,
    conflicts: [],
    integrationActions,
    fingerprints
  });
}

export async function persistDeleteManifest(projectRoot: string, resourceName: string): Promise<void> {
  const manifest = await loadManifest(projectRoot);
  const nextManifest = removeManifestResource(manifest, normalizeResourceInput(resourceName, undefined, []).names.singularPascal);
  await saveManifest(projectRoot, nextManifest);
}

export async function listResources(projectRoot: string, includeUnmanaged: boolean) {
  const config = loadProjectConfig(projectRoot);
  const resolvedPaths = resolvePaths(projectRoot, config);
  const manifest = await loadManifest(projectRoot);
  const managed = manifest.resources.map((record) => ({
    source: "manifest" as const,
    resourceName: record.resourceName,
    paths: record.paths
  }));

  if (!includeUnmanaged) {
    return managed;
  }

  const files = await fg(`${resolvedPaths.modelsDir}/**/*.model.{js,ts}`, {
    onlyFiles: true
  });
  const managedPaths = new Set(manifest.resources.flatMap((record) => record.paths));
  const unmanaged = files
    .filter((filePath) => !managedPaths.has(filePath))
    .map((filePath) => ({
      source: "scan" as const,
      resourceName: path.basename(filePath).replace(/\.model\.(js|ts)$/, ""),
      paths: [filePath]
    }));

  return [...managed, ...unmanaged];
}
