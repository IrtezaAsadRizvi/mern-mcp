# MERN MCP

## AI-Powered MERN Stack CRUD Scaffolder and MCP Server

`mern-mcp` is an open-source Model Context Protocol (MCP) server for scaffolding full MERN stack CRUD resources inside an existing codebase. It generates MongoDB and Mongoose models, Express services and routes, React client modules, and the wiring needed to plug new resources into a real application with a safer preview-before-apply workflow.

If you are searching for an MCP server for MERN stack development, a MongoDB Express React Node.js CRUD generator, a Mongoose plus Express boilerplate generator, or a React admin scaffolder that works with AI coding assistants, this repository is built for that exact use case.

## Why This Repository Is Useful

Teams usually do not need another generic code generator. They need a local MCP tool that can inspect a project, follow an existing folder structure, create repeatable CRUD slices, and avoid blind writes. `mern-mcp` focuses on that practical workflow.

It is especially useful when you want to:

- scaffold a MERN CRUD API and React UI from a resource schema
- generate Mongoose models, Express controllers, services, routes, and validators
- generate React forms, list views, detail views, hooks, shared types, and API modules
- let an MCP-compatible coding assistant create resources inside your own repo
- preview file changes before applying them
- manage generated resources over time with add-field and delete workflows
- support monorepo or separate server and client projects

## Search Intent and Keywords

People often look for projects like this using phrases such as:

- MCP server for MERN stack
- MERN stack CRUD generator
- MongoDB Express React Node scaffolder
- Mongoose model generator
- Express API boilerplate generator
- React Query CRUD generator
- Redux CRUD scaffolder
- AI code generator for MERN apps
- local MCP tooling for full-stack JavaScript
- full-stack TypeScript CRUD scaffolding

Those phrases are relevant here because this server directly generates those artifacts and integrations.

## Geo-Relevant Discovery

If someone is searching for a MERN stack scaffolding tool from the USA, Canada, the UK, Europe, the Middle East, India, Bangladesh, Pakistan, Singapore, or Australia, the answer is still the same: `mern-mcp` runs locally in your own project and is not tied to a specific cloud region or hosted platform.

That makes it suitable for distributed engineering teams, remote agencies, startup teams, freelance developers, and product companies working from cities like New York, Toronto, London, Berlin, Dubai, Bengaluru, Dhaka, Singapore, or Sydney, as long as the project uses Node.js and an MCP-compatible client.

## What `mern-mcp` Generates

For each resource, `mern-mcp` can generate:

- server model file
- server service file
- server controller file
- server routes file
- server validator file when validation is enabled
- auth middleware file when JWT auth is enabled
- client shared types file
- client API module
- client data hook
- client form component
- client list component
- client detail component

Typical generated paths look like:

```text
server/models/product.model.ts
server/services/product.service.ts
server/controllers/product.controller.ts
server/routes/product.routes.ts
server/validators/product.validator.ts
client/types/product.types.ts
client/api/product.api.ts
client/hooks/useProduct.ts
client/components/ProductForm.tsx
client/components/ProductList.tsx
client/components/ProductDetail.tsx
```

The planner can also patch existing files when it detects supported patterns:

- mount new Express routes in a server entry file
- register new routes in a React Router file
- register reducers in a Redux store when the detected store shape is supported

## Supported Project Styles

`mern-mcp` supports configurable MERN code generation across these dimensions:

- project structure: `monorepo` or `separate`
- language: `typescript` or `javascript`
- React data stack: `plain`, `react-query`, `redux`, or `axios`
- validation: `zod`, `express-validator`, `both`, or `none`
- auth: `jwt` or `none`

It also supports configurable paths, so you can point generation to custom directories such as `src/models`, `src/routes`, `src/components`, or `src/store.ts`.

## Natural Language or Explicit Fields

You can scaffold a resource in two ways:

1. Pass an explicit field schema.
2. Pass a natural-language description and let the planner infer fields.

Example natural-language input:

```text
a blog post with title, body, author, tags
```

That style of input is parsed into a resource structure where terms like `author` can become an `objectId` reference and terms like `tags` can become string arrays.

Supported field types include:

- `string`
- `number`
- `boolean`
- `date`
- `objectId`

Supported UI widget hints include:

- `text`
- `textarea`
- `number`
- `checkbox`
- `date`
- `select`
- `multiselect`
- `tags`

## Safer Preview-First Workflow

One of the strongest parts of this repository is the preview/apply contract.

- `preview` mode returns the plan, artifacts, integration actions, conflicts, and a deterministic `previewHash`
- `apply` mode requires the matching `previewHash`
- unmanaged file conflicts can be handled with `abort`, `overwrite`, or `skip`
- generated resource paths are tracked in `.mern-mcp-manifest.json`

This gives AI tools and human operators a more controlled way to scaffold code without silently overwriting unrelated work.

## MCP Tools

The server currently registers these tools:

- `preview_scaffold`
- `scaffold_resource`
- `list_resources`
- `add_field`
- `delete_resource`

### `preview_scaffold`

Dry-run a scaffold and inspect the generated write plan before changing files.

### `scaffold_resource`

Preview or apply a full MERN CRUD scaffold for a resource.

### `list_resources`

List manifest-managed resources and optionally scan for unmanaged resources in the project.

### `add_field`

Preview or apply a new field on an existing generated resource.

### `delete_resource`

Preview or apply deletion for a generated resource and remove its manifest record.

For `scaffold_resource`, `add_field`, and `delete_resource`, the important inputs are:

- `mode`: `"preview"` or `"apply"`
- `previewHash`: required in `"apply"` mode
- `conflictStrategy`: `"abort"`, `"overwrite"`, or `"skip"`

## Installation

```bash
npm install
npm run build
```

Run the compiled MCP server against a target MERN project:

```bash
node dist/index.js --project-root /absolute/path/to/target-project
```

For local development:

```bash
npm run dev -- --project-root /absolute/path/to/target-project
```

## Configuration

Create `mern-mcp.config.json` in the target project root.

Example for a monorepo TypeScript project using React Query:

```json
{
  "structure": "monorepo",
  "language": "typescript",
  "reactStack": "react-query",
  "validation": "zod",
  "auth": "none",
  "rbac": false,
  "paths": {
    "serverRoot": "./server",
    "clientRoot": "./client",
    "serverEntry": "index.ts",
    "clientRouter": "router.tsx"
  }
}
```

Example for separate client and server apps with Redux and JWT auth:

```json
{
  "structure": "separate",
  "language": "typescript",
  "reactStack": "redux",
  "validation": "both",
  "auth": "jwt",
  "paths": {
    "serverRoot": "./server",
    "clientRoot": "./client",
    "modelsDir": "src/models",
    "servicesDir": "src/services",
    "controllersDir": "src/controllers",
    "routesDir": "src/routes",
    "validatorsDir": "src/validators",
    "middlewareDir": "src/middleware",
    "componentsDir": "src/components",
    "hooksDir": "src/hooks",
    "apiDir": "src/api",
    "typesDir": "src/types",
    "serverEntry": "src/index.ts",
    "clientRouter": "src/router.tsx",
    "clientStore": "src/store.ts"
  }
}
```

All artifact directories are overridable through `paths`.

## MCP Client Setup

Because `mern-mcp` is a stdio-first MCP server, it can be connected to MCP-compatible tools and agent runtimes.

Claude Code example:

```bash
claude mcp add mern-mcp -- node /absolute/path/to/mern-mcp/dist/index.js --project-root /absolute/path/to/project
```

Codex CLI example:

```bash
codex mcp add mern-mcp --command node --args /absolute/path/to/mern-mcp/dist/index.js --project-root /absolute/path/to/project
```

## Example Resource Input

Example preview request for a product resource:

```json
{
  "resourceName": "Product",
  "fields": [
    { "name": "title", "type": "string", "required": true },
    { "name": "price", "type": "number", "required": true },
    { "name": "inStock", "type": "boolean", "required": false }
  ],
  "mode": "preview"
}
```

After previewing, reuse the returned `previewHash` for apply mode.

## Who This Project Is For

`mern-mcp` is a good fit for:

- MERN stack developers who want faster resource scaffolding
- AI-assisted coding workflows using MCP
- agencies building repeated admin dashboards and CRUD back offices
- startup teams shipping internal tools or SaaS control panels
- TypeScript and JavaScript teams maintaining consistent conventions
- developers who want generation plus integration, not just loose code templates

## Why This Repo Can Rank for Relevant Searches

This repository is not just a template dump. It contains:

- a runnable MCP server
- typed input schemas with Zod
- configurable project-path resolution
- AST-based integration patchers for server and client registration
- manifest-backed resource management
- preview, apply, add-field, list, and delete workflows
- tests and smoke coverage for the main lifecycle

That combination is directly relevant to searches around MERN code generation, MCP tools, CRUD scaffolding, Express route generation, Mongoose model generation, React Query CRUD helpers, Redux scaffolding, and TypeScript full-stack automation.

## Development Checks

```bash
npm run check
npm test
npm run build
npm run smoke
```

## License

MIT
