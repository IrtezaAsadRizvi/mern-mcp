import type { ProjectConfig, NormalizedResource } from "../types.js";

export interface GeneratorContext {
  names: NormalizedResource["names"];
  description?: string;
  fields: NormalizedResource["fields"];
  isTypeScript: boolean;
  isJavaScript: boolean;
  usesZod: boolean;
  usesExpressValidator: boolean;
  usesJwtAuth: boolean;
  isPlainStack: boolean;
  isReactQueryStack: boolean;
  isReduxStack: boolean;
  isAxiosStack: boolean;
  apiBasePath: string;
  formValuesName: string;
  entityName: string;
  fieldConfigName: string;
  initialValuesName: string;
  routePath: string;
  storeKey: string;
}

export function createGeneratorContext(
  config: ProjectConfig,
  resource: NormalizedResource
): GeneratorContext {
  return {
    names: resource.names,
    description: resource.description,
    fields: resource.fields,
    isTypeScript: config.language === "typescript",
    isJavaScript: config.language === "javascript",
    usesZod: config.validation === "zod" || config.validation === "both",
    usesExpressValidator: config.validation === "express-validator" || config.validation === "both",
    usesJwtAuth: config.auth === "jwt",
    isPlainStack: config.reactStack === "plain",
    isReactQueryStack: config.reactStack === "react-query",
    isReduxStack: config.reactStack === "redux",
    isAxiosStack: config.reactStack === "axios",
    apiBasePath: `/api/${resource.names.pluralKebab}`,
    formValuesName: `${resource.names.singularPascal}FormValues`,
    entityName: resource.names.singularPascal,
    fieldConfigName: `${resource.names.singularCamel}FieldConfig`,
    initialValuesName: `${resource.names.singularCamel}InitialValues`,
    routePath: resource.names.pluralKebab,
    storeKey: resource.names.pluralCamel
  };
}
