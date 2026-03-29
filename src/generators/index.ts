import type { NormalizedResource, ProjectConfig } from "../types.js";
import { generateAuthMiddleware } from "./auth.js";
import { generateController } from "./controller.js";
import { generateModel } from "./model.js";
import { generateRoutes } from "./routes.js";
import { generateService } from "./service.js";
import { generateSharedTypes } from "./sharedTypes.js";
import { generateValidator } from "./validator.js";
import { generateApiModule } from "./react/api.js";
import { generateDetailComponent } from "./react/detail.js";
import { generateFormComponent } from "./react/form.js";
import { generateHook } from "./react/hook.js";
import { generateListComponent } from "./react/list.js";
import type { ResourceArtifactPaths } from "../planning/pathResolver.js";

export interface GeneratedFiles {
  model: string;
  service: string;
  controller: string;
  routes: string;
  validator?: string;
  authMiddleware?: string;
  sharedTypes: string;
  api: string;
  hook: string;
  form: string;
  list: string;
  detail: string;
}

export async function generateResourceFiles(
  config: ProjectConfig,
  resource: NormalizedResource,
  paths: ResourceArtifactPaths
): Promise<GeneratedFiles> {
  return {
    model: await generateModel(config, resource, paths.modelPath),
    service: await generateService(config, resource, paths.servicePath),
    controller: await generateController(config, resource, paths.controllerPath),
    routes: await generateRoutes(config, resource, paths.routePath),
    validator:
      paths.validatorPath && config.validation !== "none"
        ? await generateValidator(config, resource, paths.validatorPath)
        : undefined,
    authMiddleware:
      paths.authMiddlewarePath && config.auth === "jwt"
        ? await generateAuthMiddleware(config, resource, paths.authMiddlewarePath)
        : undefined,
    sharedTypes: await generateSharedTypes(config, resource, paths.typesPath),
    api: await generateApiModule(config, resource, paths.apiPath),
    hook: await generateHook(config, resource, paths.hookPath),
    form: await generateFormComponent(config, resource, paths.formPath),
    list: await generateListComponent(config, resource, paths.listPath),
    detail: await generateDetailComponent(config, resource, paths.detailPath)
  };
}
