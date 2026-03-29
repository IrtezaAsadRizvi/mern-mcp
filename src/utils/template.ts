import { readFile } from "node:fs/promises";
import path from "node:path";

import Handlebars from "handlebars";
import { format } from "prettier";

const templateCache = new Map<string, Handlebars.TemplateDelegate>();

Handlebars.registerHelper("json", (value: unknown) => JSON.stringify(value));
Handlebars.registerHelper("eq", (left: unknown, right: unknown) => left === right);
Handlebars.registerHelper("or", (left: unknown, right: unknown) => Boolean(left || right));
Handlebars.registerHelper("and", (left: unknown, right: unknown) => Boolean(left && right));
Handlebars.registerHelper("not", (value: unknown) => !value);

function getTemplateDirectory(): URL {
  return new URL("../templates/", import.meta.url);
}

async function loadTemplate(relativePath: string): Promise<Handlebars.TemplateDelegate> {
  const cached = templateCache.get(relativePath);

  if (cached) {
    return cached;
  }

  const templateUrl = new URL(relativePath, getTemplateDirectory());
  const source = await readFile(templateUrl, "utf8");
  const compiled = Handlebars.compile(source, {
    noEscape: true
  });

  templateCache.set(relativePath, compiled);
  return compiled;
}

export async function renderTemplate(
  relativePath: string,
  context: object,
  outputPath: string
): Promise<string> {
  const template = await loadTemplate(relativePath);
  const rendered = template(context).trim();

  return format(rendered, {
    filepath: outputPath,
    printWidth: 100
  });
}

export function removeExtension(filePath: string): string {
  return filePath.slice(0, -path.extname(filePath).length);
}
