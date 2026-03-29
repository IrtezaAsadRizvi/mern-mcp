import pluralize from "pluralize";

import type { ResourceNames } from "../types.js";

const wordBoundaryPattern = /([a-z0-9])([A-Z])/g;
const delimiterPattern = /[^A-Za-z0-9]+/g;

function splitWords(value: string): string[] {
  return value
    .replace(wordBoundaryPattern, "$1 $2")
    .replace(delimiterPattern, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function capitalize(value: string): string {
  return value.length === 0 ? value : `${value[0]!.toUpperCase()}${value.slice(1)}`;
}

export function toPascalCase(value: string): string {
  return splitWords(value).map(capitalize).join("");
}

export function toCamelCase(value: string): string {
  const words = splitWords(value);

  if (words.length === 0) {
    return "";
  }

  return [words[0]!, ...words.slice(1).map(capitalize)].join("");
}

export function toKebabCase(value: string): string {
  return splitWords(value).join("-");
}

export function toSnakeCase(value: string): string {
  return splitWords(value).join("_");
}

export function toDisplayName(value: string): string {
  return splitWords(value).map(capitalize).join(" ");
}

export function buildResourceNames(resourceName: string): ResourceNames {
  const singularDisplay = toDisplayName(resourceName);
  const singularBase = singularDisplay || resourceName;
  const pluralDisplay = pluralize(singularBase);

  return {
    raw: resourceName,
    singularPascal: toPascalCase(singularBase),
    singularCamel: toCamelCase(singularBase),
    singularKebab: toKebabCase(singularBase),
    singularSnake: toSnakeCase(singularBase),
    pluralPascal: toPascalCase(pluralDisplay),
    pluralCamel: toCamelCase(pluralDisplay),
    pluralKebab: toKebabCase(pluralDisplay),
    pluralSnake: toSnakeCase(pluralDisplay),
    displayName: singularDisplay
  };
}
