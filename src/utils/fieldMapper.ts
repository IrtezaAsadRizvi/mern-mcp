import type {
  NormalizedField,
  ResourceFieldInput,
  UiWidget
} from "../types.js";
import { buildResourceNames, toCamelCase, toDisplayName } from "./naming.js";

function inferWidget(field: ResourceFieldInput): UiWidget {
  if (field.uiWidget) {
    return field.uiWidget;
  }

  if (field.enumValues.length > 0) {
    return field.isArray ? "multiselect" : "select";
  }

  if (field.isArray) {
    return "tags";
  }

  switch (field.type) {
    case "boolean":
      return "checkbox";
    case "number":
      return "number";
    case "date":
      return "date";
    default:
      return field.name.toLowerCase().includes("body") ? "textarea" : "text";
  }
}

function mapTsType(field: ResourceFieldInput): string {
  const baseType =
    field.enumValues.length > 0
      ? field.enumValues.map((value) => JSON.stringify(value)).join(" | ")
      : field.type === "string"
        ? "string"
        : field.type === "number"
          ? "number"
          : field.type === "boolean"
            ? "boolean"
            : field.type === "date"
              ? "string"
              : "string";

  return field.isArray ? `${baseType}[]` : baseType;
}

function mapMongooseType(field: ResourceFieldInput): string {
  switch (field.type) {
    case "string":
      return "String";
    case "number":
      return "Number";
    case "boolean":
      return "Boolean";
    case "date":
      return "Date";
    case "objectId":
      return "Schema.Types.ObjectId";
  }
}

function mapMongooseSchemaValue(field: ResourceFieldInput): string {
  const baseValue = [
    `type: ${mapMongooseType(field)}`,
    field.required ? "required: true" : undefined,
    field.unique ? "unique: true" : undefined,
    field.indexed ? "index: true" : undefined,
    field.ref ? `ref: "${buildResourceNames(field.ref).singularPascal}"` : undefined,
    field.enumValues.length > 0 ? `enum: [${field.enumValues.map((value) => JSON.stringify(value)).join(", ")}]` : undefined,
    field.defaultValue !== undefined ? `default: ${JSON.stringify(field.defaultValue)}` : undefined
  ].filter(Boolean);

  const schemaObject = `{ ${baseValue.join(", ")} }`;
  return field.isArray ? `[${schemaObject}]` : schemaObject;
}

function mapZodSchema(field: ResourceFieldInput): string {
  const baseSchema =
    field.enumValues.length > 0
      ? `z.enum([${field.enumValues.map((value) => JSON.stringify(value)).join(", ")}])`
      : field.type === "string"
        ? "z.string()"
        : field.type === "number"
          ? "z.number()"
          : field.type === "boolean"
            ? "z.boolean()"
            : field.type === "date"
              ? "z.string().datetime()"
              : "z.string()";

  const arraySchema = field.isArray ? `z.array(${baseSchema})` : baseSchema;
  return field.required ? arraySchema : `${arraySchema}.optional()`;
}

function mapExpressValidatorRules(field: ResourceFieldInput, forceOptional: boolean): string {
  const accessor = `body("${toCamelCase(field.name)}")`;
  const rules = [accessor];

  if (forceOptional || !field.required) {
    rules.push(".optional()");
  }

  if (field.isArray) {
    rules.push(".isArray()");
  } else {
    switch (field.type) {
      case "string":
        rules.push(".isString()");
        break;
      case "number":
        rules.push(".isNumeric()");
        break;
      case "boolean":
        rules.push(".isBoolean()");
        break;
      case "date":
        rules.push(".isISO8601()");
        break;
      case "objectId":
        rules.push(".isMongoId()");
        break;
    }
  }

  if (field.enumValues.length > 0) {
    rules.push(`.isIn([${field.enumValues.map((value) => JSON.stringify(value)).join(", ")}])`);
  }

  return rules.join("");
}

function mapInputType(field: ResourceFieldInput): string {
  switch (inferWidget(field)) {
    case "number":
      return "number";
    case "checkbox":
      return "checkbox";
    case "date":
      return "date";
    default:
      return "text";
  }
}

function mapInitialValue(field: ResourceFieldInput): string {
  if (field.defaultValue !== undefined) {
    return JSON.stringify(field.defaultValue);
  }

  if (field.isArray) {
    return "[]";
  }

  if (field.enumValues.length > 0) {
    return JSON.stringify(field.enumValues[0] ?? "");
  }

  switch (field.type) {
    case "number":
      return "0";
    case "boolean":
      return "false";
    default:
      return "\"\"";
  }
}

export function normalizeField(field: ResourceFieldInput): NormalizedField {
  const key = toCamelCase(field.name);
  const widget = inferWidget(field);

  return {
    ...field,
    key,
    label: field.uiLabel ?? toDisplayName(field.name),
    tsType: mapTsType(field),
    mongooseType: mapMongooseType(field),
    mongooseSchemaValue: mapMongooseSchemaValue(field),
    zodSchema: mapZodSchema(field),
    createExpressValidatorRule: mapExpressValidatorRules(field, false),
    updateExpressValidatorRule: mapExpressValidatorRules(field, true),
    formInputType: mapInputType(field),
    formWidget: widget,
    initialValue: mapInitialValue(field)
  };
}
