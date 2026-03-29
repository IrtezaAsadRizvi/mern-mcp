import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { ProjectConfig, ResolvedPaths } from "../types.js";
import { configFileName, projectConfigSchema } from "../types.js";

const serverDefaults = {
  modelsDir: "models",
  servicesDir: "services",
  controllersDir: "controllers",
  routesDir: "routes",
  validatorsDir: "validators",
  middlewareDir: "middleware"
};

const clientDefaults = {
  componentsDir: "components",
  hooksDir: "hooks",
  apiDir: "api",
  typesDir: "types"
};

function resolveWithin(root: string, provided: string | undefined, fallback: string): string {
  const target = provided ?? fallback;
  return path.resolve(root, target);
}

function resolveOptionalWithin(root: string, provided: string | undefined): string | undefined {
  return provided ? path.resolve(root, provided) : undefined;
}

export function loadProjectConfig(projectRoot: string): ProjectConfig {
  const configPath = path.join(projectRoot, configFileName);

  if (!existsSync(configPath)) {
    return projectConfigSchema.parse({});
  }

  const raw = readFileSync(configPath, "utf8");
  return projectConfigSchema.parse(JSON.parse(raw));
}

export function resolvePaths(projectRoot: string, config: ProjectConfig): ResolvedPaths {
  const serverRoot = path.resolve(projectRoot, config.paths.serverRoot);
  const clientRoot = path.resolve(projectRoot, config.paths.clientRoot);

  return {
    projectRoot,
    serverRoot,
    clientRoot,
    modelsDir: resolveWithin(serverRoot, config.paths.modelsDir, serverDefaults.modelsDir),
    servicesDir: resolveWithin(serverRoot, config.paths.servicesDir, serverDefaults.servicesDir),
    controllersDir: resolveWithin(serverRoot, config.paths.controllersDir, serverDefaults.controllersDir),
    routesDir: resolveWithin(serverRoot, config.paths.routesDir, serverDefaults.routesDir),
    validatorsDir: resolveWithin(serverRoot, config.paths.validatorsDir, serverDefaults.validatorsDir),
    middlewareDir: resolveWithin(serverRoot, config.paths.middlewareDir, serverDefaults.middlewareDir),
    componentsDir: resolveWithin(clientRoot, config.paths.componentsDir, clientDefaults.componentsDir),
    hooksDir: resolveWithin(clientRoot, config.paths.hooksDir, clientDefaults.hooksDir),
    apiDir: resolveWithin(clientRoot, config.paths.apiDir, clientDefaults.apiDir),
    typesDir: resolveWithin(clientRoot, config.paths.typesDir, clientDefaults.typesDir),
    serverEntry: resolveOptionalWithin(serverRoot, config.paths.serverEntry),
    serverRouter: resolveOptionalWithin(serverRoot, config.paths.serverRouter),
    clientRouter: resolveOptionalWithin(clientRoot, config.paths.clientRouter),
    clientStore: resolveOptionalWithin(clientRoot, config.paths.clientStore),
    clientApiProvider: resolveOptionalWithin(clientRoot, config.paths.clientApiProvider)
  };
}
