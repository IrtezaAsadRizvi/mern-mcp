import path from "node:path";

import type { FileArtifact, ProjectConfig, ResolvedPaths, ResourceNames } from "../types.js";

function getServerExtension(language: ProjectConfig["language"]): string {
  return language === "typescript" ? "ts" : "js";
}

function getClientExtension(language: ProjectConfig["language"]): string {
  return language === "typescript" ? "tsx" : "jsx";
}

function getClientCodeExtension(language: ProjectConfig["language"]): string {
  return language === "typescript" ? "ts" : "js";
}

function withRelative(projectRoot: string, absolutePath: string): Pick<FileArtifact, "path" | "relativePath"> {
  return {
    path: absolutePath,
    relativePath: path.relative(projectRoot, absolutePath) || path.basename(absolutePath)
  };
}

export interface ResourceArtifactPaths {
  modelPath: string;
  servicePath: string;
  controllerPath: string;
  routePath: string;
  validatorPath?: string;
  authMiddlewarePath?: string;
  formPath: string;
  listPath: string;
  detailPath: string;
  hookPath: string;
  apiPath: string;
  typesPath: string;
}

export function resolveResourceArtifactPaths(
  resolvedPaths: ResolvedPaths,
  config: ProjectConfig,
  names: ResourceNames
): ResourceArtifactPaths {
  const serverExtension = getServerExtension(config.language);
  const componentExtension = getClientExtension(config.language);
  const clientCodeExtension = getClientCodeExtension(config.language);

  return {
    modelPath: path.join(resolvedPaths.modelsDir, `${names.singularKebab}.model.${serverExtension}`),
    servicePath: path.join(resolvedPaths.servicesDir, `${names.singularKebab}.service.${serverExtension}`),
    controllerPath: path.join(resolvedPaths.controllersDir, `${names.singularKebab}.controller.${serverExtension}`),
    routePath: path.join(resolvedPaths.routesDir, `${names.singularKebab}.routes.${serverExtension}`),
    validatorPath:
      config.validation === "none"
        ? undefined
        : path.join(resolvedPaths.validatorsDir, `${names.singularKebab}.validator.${serverExtension}`),
    authMiddlewarePath:
      config.auth === "jwt"
        ? path.join(resolvedPaths.middlewareDir, `auth.middleware.${serverExtension}`)
        : undefined,
    formPath: path.join(resolvedPaths.componentsDir, `${names.singularPascal}Form.${componentExtension}`),
    listPath: path.join(resolvedPaths.componentsDir, `${names.singularPascal}List.${componentExtension}`),
    detailPath: path.join(resolvedPaths.componentsDir, `${names.singularPascal}Detail.${componentExtension}`),
    hookPath: path.join(resolvedPaths.hooksDir, `use${names.singularPascal}.${clientCodeExtension}`),
    apiPath: path.join(resolvedPaths.apiDir, `${names.singularKebab}.api.${clientCodeExtension}`),
    typesPath: path.join(resolvedPaths.typesDir, `${names.singularKebab}.types.${clientCodeExtension}`)
  };
}

export function toArtifactLocation(projectRoot: string, absolutePath: string): Pick<FileArtifact, "path" | "relativePath"> {
  return withRelative(projectRoot, absolutePath);
}
