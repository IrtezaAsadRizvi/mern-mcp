import type { ResourceFieldInput } from "../types.js";
import { buildResourceNames, toDisplayName } from "./naming.js";

const listDelimiter = /\s*,\s*|\s+and\s+|\s*\+\s*/i;

function inferFieldType(token: string): Pick<ResourceFieldInput, "type" | "isArray" | "ref"> {
  const normalized = token.trim();
  const lower = normalized.toLowerCase();

  if (/(tags|labels|categories|roles|items)$/.test(lower)) {
    return { type: "string", isArray: true, ref: undefined };
  }

  if (/^(is|has)[A-Z_ ]|^(is|has)[a-z]/.test(normalized) || /(enabled|active|published|archived)$/.test(lower)) {
    return { type: "boolean", isArray: false, ref: undefined };
  }

  if (/(price|amount|total|count|age|quantity|rating|score|number)$/.test(lower)) {
    return { type: "number", isArray: false, ref: undefined };
  }

  if (/(date|time|at)$/.test(lower)) {
    return { type: "date", isArray: false, ref: undefined };
  }

  if (/(author|owner|creator|user|account)$/.test(lower) || lower.endsWith("id")) {
    const refName = lower.endsWith("id") ? normalized.slice(0, -2) : normalized;
    return {
      type: "objectId",
      isArray: false,
      ref: buildResourceNames(refName).singularPascal
    };
  }

  return { type: "string", isArray: false, ref: undefined };
}

export function parseDescriptionToFields(description: string): ResourceFieldInput[] {
  const withMatch = description.match(/\bwith\b(.+)$/i);
  const listText = (withMatch?.[1] ?? description)
    .replace(/^[Aa]n?\s+/, "")
    .trim();
  const tokens = listText
    .split(listDelimiter)
    .map((part) => part.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error("Unable to infer fields from description");
  }

  return tokens.map((token) => {
    const cleanName = toDisplayName(token);
    const inferred = inferFieldType(cleanName);

    return {
      name: cleanName,
      type: inferred.type,
      isArray: inferred.isArray,
      ref: inferred.ref,
      required: true,
      enumValues: [],
      unique: false,
      indexed: false
    };
  });
}
