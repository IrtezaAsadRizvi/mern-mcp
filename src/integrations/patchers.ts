import path from "node:path";

import { parse, print, types } from "recast";
import babelParser from "recast/parsers/babel.js";
import babelTsParser from "recast/parsers/babel-ts.js";
import typescriptParser from "recast/parsers/typescript.js";

const { builders: b, namedTypes: n, visit } = types;

function getParser(filePath: string) {
  if (/\.tsx$/.test(filePath)) {
    return babelTsParser;
  }

  if (/\.ts$/.test(filePath)) {
    return typescriptParser;
  }

  return babelParser;
}

function stripExtension(filePath: string): string {
  return filePath.replace(/\.[^.]+$/, "");
}

function toImportPath(fromFile: string, targetFile: string): string {
  const relative = path.relative(path.dirname(fromFile), stripExtension(targetFile));
  if (relative.startsWith(".")) {
    return relative;
  }

  return `./${relative}`;
}

function parseModule(source: string, filePath: string) {
  return parse(source, {
    parser: getParser(filePath)
  });
}

function ensureImport(
  ast: ReturnType<typeof parseModule>,
  sourcePath: string,
  options: {
    defaultImport?: string;
    namedImports?: string[];
  }
): void {
  let existingImport: types.namedTypes.ImportDeclaration | undefined;

  visit(ast, {
    visitImportDeclaration(importPath) {
      if (importPath.node.source.value === sourcePath) {
        existingImport = importPath.node;
        return false;
      }

      this.traverse(importPath);
      return undefined;
    }
  });

  if (!existingImport) {
    const specifiers = [];

    if (options.defaultImport) {
      specifiers.push(b.importDefaultSpecifier(b.identifier(options.defaultImport)));
    }

    for (const name of options.namedImports ?? []) {
      specifiers.push(b.importSpecifier(b.identifier(name)));
    }

    ast.program.body.unshift(b.importDeclaration(specifiers, b.literal(sourcePath)));
    return;
  }

  if (options.defaultImport) {
    const hasDefault = existingImport.specifiers?.some((specifier) =>
      n.ImportDefaultSpecifier.check(specifier)
    );

    if (!hasDefault) {
      existingImport.specifiers = [
        b.importDefaultSpecifier(b.identifier(options.defaultImport)),
        ...(existingImport.specifiers ?? [])
      ];
    }
  }

  for (const name of options.namedImports ?? []) {
    const alreadyImported = existingImport.specifiers?.some(
      (specifier) => n.ImportSpecifier.check(specifier) && specifier.imported.name === name
    );

    if (!alreadyImported) {
      existingImport.specifiers = [
        ...(existingImport.specifiers ?? []),
        b.importSpecifier(b.identifier(name))
      ];
    }
  }
}

function removeImportSpecifiers(
  ast: ReturnType<typeof parseModule>,
  sourcePath: string,
  specifierNames: string[]
): void {
  ast.program.body = ast.program.body.flatMap((statement: (typeof ast.program.body)[number]) => {
    if (!n.ImportDeclaration.check(statement) || statement.source.value !== sourcePath) {
      return [statement];
    }

    const specifiers = (statement.specifiers ?? []).filter((specifier) => {
      if (n.ImportDefaultSpecifier.check(specifier)) {
        return !specifier.local || !specifierNames.includes(String(specifier.local.name));
      }

      if (n.ImportSpecifier.check(specifier)) {
        return !n.Identifier.check(specifier.imported) || !specifierNames.includes(specifier.imported.name);
      }

      return true;
    });

    if (specifiers.length === 0) {
      return [];
    }

    statement.specifiers = specifiers;
    return [statement];
  });
}

function printModule(ast: ReturnType<typeof parseModule>): string {
  return print(ast).code;
}

function isIdentifierNamed(node: unknown, name: string): boolean {
  return n.Identifier.check(node) && node.name === name;
}

function isObjectPropertyNamed(property: unknown, name: string): property is types.namedTypes.Property {
  return (
    n.Property.check(property) &&
    isIdentifierNamed(property.key, name)
  );
}

function isObjectPropertyNamedCompat(
  property: unknown,
  name: string
): property is types.namedTypes.Property | types.namedTypes.ObjectProperty {
  return (
    (n.Property.check(property) || n.ObjectProperty.check(property)) &&
    isIdentifierNamed(property.key, name)
  );
}

function isNamedObjectExpressionProperty(
  property: unknown,
  name: string
): property is types.namedTypes.Property | types.namedTypes.ObjectProperty {
  return isObjectPropertyNamedCompat(property, name) && n.ObjectExpression.check(property.value);
}

function findFirstCallTarget(source: string, candidates: string[]): string | undefined {
  return candidates.find((candidate) => source.includes(`${candidate}.use(`) || source.includes(`${candidate}.listen(`));
}

export function patchServerMount(options: {
  content: string;
  filePath: string;
  routeFilePath: string;
  routeIdentifier: string;
  mountPath: string;
}): { applied: boolean; content: string } {
  const ast = parseModule(options.content, options.filePath);
  const importPath = toImportPath(options.filePath, options.routeFilePath);

  ensureImport(ast, importPath, {
    defaultImport: options.routeIdentifier
  });

  const mountTarget =
    findFirstCallTarget(options.content, ["app", "router"]) ??
    "app";

  let alreadyMounted = false;

  visit(ast, {
    visitCallExpression(callPath) {
      const node = callPath.node;

      if (
        n.MemberExpression.check(node.callee) &&
        n.Identifier.check(node.callee.object) &&
        n.Identifier.check(node.callee.property) &&
        node.callee.object.name === mountTarget &&
        node.callee.property.name === "use" &&
        node.arguments.length >= 2 &&
        n.Literal.check(node.arguments[0]) &&
        node.arguments[0].value === options.mountPath &&
        n.Identifier.check(node.arguments[1]) &&
        node.arguments[1].name === options.routeIdentifier
      ) {
        alreadyMounted = true;
        return false;
      }

      this.traverse(callPath);
      return undefined;
    }
  });

  if (!alreadyMounted) {
    ast.program.body.push(
      b.expressionStatement(
        b.callExpression(
          b.memberExpression(b.identifier(mountTarget), b.identifier("use")),
          [b.literal(options.mountPath), b.identifier(options.routeIdentifier)]
        )
      )
    );
  }

  return {
    applied: true,
    content: printModule(ast)
  };
}

export function unpatchServerMount(options: {
  content: string;
  filePath: string;
  routeFilePath: string;
  routeIdentifier: string;
  mountPath: string;
}): { applied: boolean; content: string } {
  const ast = parseModule(options.content, options.filePath);
  const importPath = toImportPath(options.filePath, options.routeFilePath);

  removeImportSpecifiers(ast, importPath, [options.routeIdentifier]);

  ast.program.body = ast.program.body.filter((statement: (typeof ast.program.body)[number]) => {
    if (!n.ExpressionStatement.check(statement) || !n.CallExpression.check(statement.expression)) {
      return true;
    }

    const expression = statement.expression;
    return !(
      n.MemberExpression.check(expression.callee) &&
      n.Identifier.check(expression.callee.property) &&
      expression.callee.property.name === "use" &&
      expression.arguments.length >= 2 &&
      n.Literal.check(expression.arguments[0]) &&
      expression.arguments[0].value === options.mountPath &&
      n.Identifier.check(expression.arguments[1]) &&
      expression.arguments[1].name === options.routeIdentifier
    );
  });

  return {
    applied: true,
    content: printModule(ast)
  };
}

export function patchReduxStore(options: {
  content: string;
  filePath: string;
  apiFilePath: string;
  reducerIdentifier: string;
  keyIdentifier: string;
}): { applied: boolean; content: string } {
  const ast = parseModule(options.content, options.filePath);
  const importPath = toImportPath(options.filePath, options.apiFilePath);

  ensureImport(ast, importPath, {
    namedImports: [options.reducerIdentifier, options.keyIdentifier]
  });

  let applied = false;

  visit(ast, {
    visitCallExpression(callPath) {
      const node = callPath.node;

      if (
        n.Identifier.check(node.callee) &&
        node.callee.name === "configureStore" &&
        node.arguments.length > 0 &&
        n.ObjectExpression.check(node.arguments[0])
      ) {
        const configObject = node.arguments[0];
        const reducerProperty = configObject.properties.find(
          (property) => isNamedObjectExpressionProperty(property, "reducer")
        );

        if (reducerProperty && n.ObjectExpression.check(reducerProperty.value)) {
          const reducerValue = reducerProperty.value;
          const hasReducer = reducerValue.properties.some(
            (property: (typeof reducerValue.properties)[number]) =>
              (n.Property.check(property) || n.ObjectProperty.check(property)) &&
              property.computed === true &&
              isIdentifierNamed(property.key, options.keyIdentifier)
          );

          if (!hasReducer) {
            const nextProperty = b.property(
              "init",
              b.identifier(options.keyIdentifier),
              b.identifier(options.reducerIdentifier)
            );
            nextProperty.computed = true;
            reducerValue.properties.push(nextProperty);
          }

          applied = true;
        }

        return false;
      }

      this.traverse(callPath);
      return undefined;
    }
  });

  return {
    applied,
    content: applied ? printModule(ast) : options.content
  };
}

export function unpatchReduxStore(options: {
  content: string;
  filePath: string;
  apiFilePath: string;
  reducerIdentifier: string;
  keyIdentifier: string;
}): { applied: boolean; content: string } {
  const ast = parseModule(options.content, options.filePath);
  const importPath = toImportPath(options.filePath, options.apiFilePath);

  removeImportSpecifiers(ast, importPath, [options.reducerIdentifier, options.keyIdentifier]);

  visit(ast, {
    visitCallExpression(callPath) {
      const node = callPath.node;

      if (
        n.Identifier.check(node.callee) &&
        node.callee.name === "configureStore" &&
        node.arguments.length > 0 &&
        n.ObjectExpression.check(node.arguments[0])
      ) {
        const reducerProperty = node.arguments[0].properties.find(
          (property) => isNamedObjectExpressionProperty(property, "reducer")
        );

        if (reducerProperty && n.ObjectExpression.check(reducerProperty.value)) {
          const reducerValue = reducerProperty.value;
          reducerValue.properties = reducerValue.properties.filter(
            (property: (typeof reducerValue.properties)[number]) =>
              !(
                (n.Property.check(property) || n.ObjectProperty.check(property)) &&
                property.computed === true &&
                isIdentifierNamed(property.key, options.keyIdentifier)
              )
          );
        }

        return false;
      }

      this.traverse(callPath);
      return undefined;
    }
  });

  return {
    applied: true,
    content: printModule(ast)
  };
}

function createRouteElement(componentName: string) {
  return b.jsxElement(
    b.jsxOpeningElement(b.jsxIdentifier(componentName), [], true),
    null,
    []
  );
}

export function patchClientRouter(options: {
  content: string;
  filePath: string;
  listComponentPath: string;
  formComponentPath: string;
  detailComponentPath: string;
  names: {
    singularPascal: string;
    pluralKebab: string;
  };
}): { applied: boolean; content: string } {
  const ast = parseModule(options.content, options.filePath);

  ensureImport(ast, toImportPath(options.filePath, options.listComponentPath), {
    namedImports: [options.names.singularPascal + "List"]
  });
  ensureImport(ast, toImportPath(options.filePath, options.formComponentPath), {
    namedImports: [options.names.singularPascal + "Form"]
  });
  ensureImport(ast, toImportPath(options.filePath, options.detailComponentPath), {
    namedImports: [options.names.singularPascal + "Detail"]
  });

  let applied = false;

  visit(ast, {
    visitCallExpression(callPath) {
      const node = callPath.node;

      if (
        n.Identifier.check(node.callee) &&
        node.callee.name === "createBrowserRouter" &&
        node.arguments.length > 0 &&
        n.ArrayExpression.check(node.arguments[0])
      ) {
        const routes = node.arguments[0];
        const routeBase = `/${options.names.pluralKebab}`;
        const existingPaths = new Set(
          routes.elements
            .filter((element): element is types.namedTypes.ObjectExpression => n.ObjectExpression.check(element))
            .flatMap((element) =>
              element.properties.flatMap((property) =>
                isObjectPropertyNamedCompat(property, "path") &&
                n.Literal.check(property.value) &&
                typeof property.value.value === "string"
                  ? [property.value.value]
                  : []
              )
            )
        );

        const additions = [
          {
            routePath: routeBase,
            componentName: `${options.names.singularPascal}List`
          },
          {
            routePath: `${routeBase}/new`,
            componentName: `${options.names.singularPascal}Form`
          },
          {
            routePath: `${routeBase}/:id`,
            componentName: `${options.names.singularPascal}Detail`
          }
        ]
          .filter((item) => !existingPaths.has(item.routePath))
          .map((item) =>
            b.objectExpression([
              b.property("init", b.identifier("path"), b.literal(item.routePath)),
              b.property("init", b.identifier("element"), createRouteElement(item.componentName))
            ])
          );

        routes.elements.push(...additions);
        applied = true;
        return false;
      }

      this.traverse(callPath);
      return undefined;
    }
  });

  return {
    applied,
    content: applied ? printModule(ast) : options.content
  };
}
