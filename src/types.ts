import { z } from "zod/v4";

export const configFileName = "mern-mcp.config.json";
export const manifestFileName = ".mern-mcp-manifest.json";

export const structureSchema = z.enum(["monorepo", "separate"]);
export const languageSchema = z.enum(["typescript", "javascript"]);
export const reactStackSchema = z.enum(["plain", "react-query", "redux", "axios"]);
export const validationSchema = z.enum(["zod", "express-validator", "both", "none"]);
export const authSchema = z.enum(["jwt", "none"]);
export const toolModeSchema = z.enum(["preview", "apply"]);
export const conflictStrategySchema = z.enum(["abort", "overwrite", "skip"]);
export const fieldTypeSchema = z.enum(["string", "number", "boolean", "date", "objectId"]);
export const uiWidgetSchema = z.enum([
  "text",
  "textarea",
  "number",
  "checkbox",
  "date",
  "select",
  "multiselect",
  "tags"
]);

const pathSchema = z
  .object({
    serverRoot: z.string().default("./server"),
    clientRoot: z.string().default("./client"),
    modelsDir: z.string().optional(),
    servicesDir: z.string().optional(),
    controllersDir: z.string().optional(),
    routesDir: z.string().optional(),
    validatorsDir: z.string().optional(),
    middlewareDir: z.string().optional(),
    componentsDir: z.string().optional(),
    hooksDir: z.string().optional(),
    apiDir: z.string().optional(),
    typesDir: z.string().optional(),
    serverEntry: z.string().optional(),
    serverRouter: z.string().optional(),
    clientRouter: z.string().optional(),
    clientStore: z.string().optional(),
    clientApiProvider: z.string().optional()
  })
  .default({
    serverRoot: "./server",
    clientRoot: "./client"
  });

export const projectConfigSchema = z.object({
  structure: structureSchema.default("monorepo"),
  language: languageSchema.default("typescript"),
  reactStack: reactStackSchema.default("react-query"),
  validation: validationSchema.default("zod"),
  auth: authSchema.default("none"),
  rbac: z.boolean().default(false),
  paths: pathSchema
});

const identifierSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z][A-Za-z0-9_ -]*$/, "Expected a human-readable identifier");

export const resourceFieldSchema = z
  .object({
    name: identifierSchema,
    type: fieldTypeSchema,
    required: z.boolean().default(false),
    isArray: z.boolean().default(false),
    enumValues: z.array(z.string().min(1)).default([]),
    ref: z.string().min(1).optional(),
    defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
    unique: z.boolean().default(false),
    indexed: z.boolean().default(false),
    uiLabel: z.string().min(1).optional(),
    uiWidget: uiWidgetSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (value.enumValues.length > 0 && value.type !== "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "enumValues are only supported for string fields",
        path: ["enumValues"]
      });
    }

    if (value.ref && value.type !== "objectId") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ref is only supported for objectId fields",
        path: ["ref"]
      });
    }
  });

export const projectOverrideSchema = z.object({
  structure: structureSchema.optional(),
  language: languageSchema.optional(),
  reactStack: reactStackSchema.optional(),
  validation: validationSchema.optional(),
  auth: authSchema.optional(),
  rbac: z.boolean().optional()
});

export const scaffoldResourceSchema = z
  .object({
    resourceName: identifierSchema,
    description: z.string().min(1).optional(),
    fields: z.array(resourceFieldSchema).min(1).optional(),
    overrides: projectOverrideSchema.optional(),
    mode: toolModeSchema.default("preview"),
    previewHash: z.string().min(12).optional(),
    conflictStrategy: conflictStrategySchema.default("abort")
  })
  .superRefine((value, ctx) => {
    if (!value.description && (!value.fields || value.fields.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either description or fields",
        path: ["fields"]
      });
    }
  });

export const addFieldSchema = z.object({
  resourceName: identifierSchema,
  field: resourceFieldSchema,
  mode: toolModeSchema.default("preview"),
  previewHash: z.string().min(12).optional(),
  conflictStrategy: conflictStrategySchema.default("abort")
});

export const deleteResourceSchema = z.object({
  resourceName: identifierSchema,
  mode: toolModeSchema.default("preview"),
  previewHash: z.string().min(12).optional(),
  conflictStrategy: conflictStrategySchema.default("abort")
});

export const listResourcesSchema = z.object({
  includeUnmanaged: z.boolean().default(true)
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;
export type ProjectOverrides = z.infer<typeof projectOverrideSchema>;
export type ProjectStructure = z.infer<typeof structureSchema>;
export type ProjectLanguage = z.infer<typeof languageSchema>;
export type ReactStack = z.infer<typeof reactStackSchema>;
export type ValidationMode = z.infer<typeof validationSchema>;
export type AuthMode = z.infer<typeof authSchema>;
export type ToolMode = z.infer<typeof toolModeSchema>;
export type ConflictStrategy = z.infer<typeof conflictStrategySchema>;
export type FieldType = z.infer<typeof fieldTypeSchema>;
export type UiWidget = z.infer<typeof uiWidgetSchema>;
export type ResourceFieldInput = z.infer<typeof resourceFieldSchema>;
export type ScaffoldResourceInput = z.infer<typeof scaffoldResourceSchema>;
export type AddFieldInput = z.infer<typeof addFieldSchema>;
export type DeleteResourceInput = z.infer<typeof deleteResourceSchema>;
export type ListResourcesInput = z.infer<typeof listResourcesSchema>;

export interface ResourceNames {
  raw: string;
  singularPascal: string;
  singularCamel: string;
  singularKebab: string;
  singularSnake: string;
  pluralPascal: string;
  pluralCamel: string;
  pluralKebab: string;
  pluralSnake: string;
  displayName: string;
}

export interface NormalizedField extends ResourceFieldInput {
  key: string;
  label: string;
  tsType: string;
  mongooseType: string;
  mongooseSchemaValue: string;
  zodSchema: string;
  createExpressValidatorRule: string;
  updateExpressValidatorRule: string;
  formInputType: string;
  formWidget: UiWidget;
  initialValue: string;
}

export interface NormalizedResource {
  names: ResourceNames;
  description?: string;
  fields: NormalizedField[];
}

export interface ResolvedPaths {
  projectRoot: string;
  serverRoot: string;
  clientRoot: string;
  modelsDir: string;
  servicesDir: string;
  controllersDir: string;
  routesDir: string;
  validatorsDir: string;
  middlewareDir: string;
  componentsDir: string;
  hooksDir: string;
  apiDir: string;
  typesDir: string;
  serverEntry?: string;
  serverRouter?: string;
  clientRouter?: string;
  clientStore?: string;
  clientApiProvider?: string;
}

export type ArtifactAction = "create" | "update" | "delete" | "skip";

export interface FileArtifact {
  kind: string;
  path: string;
  relativePath: string;
  action: ArtifactAction;
  content?: string;
  existingContent?: string;
  reason?: string;
}

export interface ConflictRecord {
  path: string;
  relativePath: string;
  action: ArtifactAction;
  reason: string;
}

export interface IntegrationAction {
  kind: "patch" | "manual";
  path?: string;
  relativePath?: string;
  description: string;
  applied: boolean;
}

export interface FileFingerprint {
  path: string;
  exists: boolean;
  contentHash: string | null;
}

export interface ScaffoldPlan {
  mode: ToolMode;
  config: ProjectConfig;
  resource: NormalizedResource;
  paths: ResolvedPaths;
  artifacts: FileArtifact[];
  conflicts: ConflictRecord[];
  integrationActions: IntegrationAction[];
  fingerprints: FileFingerprint[];
  previewHash: string;
}

export interface WriteResult {
  written: string[];
  skipped: string[];
  deleted: string[];
}

export interface ManifestResourceRecord {
  resourceName: string;
  description?: string;
  fields: ResourceFieldInput[];
  paths: string[];
  language: ProjectLanguage;
  reactStack: ReactStack;
  validation: ValidationMode;
  auth: AuthMode;
  updatedAt: string;
}

export interface ManifestFile {
  version: 1;
  resources: ManifestResourceRecord[];
}

export const manifestSchema = z.object({
  version: z.literal(1),
  resources: z.array(
    z.object({
      resourceName: z.string(),
      description: z.string().optional(),
      fields: z.array(resourceFieldSchema),
      paths: z.array(z.string()),
      language: languageSchema,
      reactStack: reactStackSchema,
      validation: validationSchema,
      auth: authSchema,
      updatedAt: z.string()
    })
  )
});
