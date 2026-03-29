#!/usr/bin/env node
import process from "node:process";
import { pathToFileURL } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { addField } from "./tools/addField.js";
import { resolveProjectRootFromProcess } from "./tools/common.js";
import { deleteResource } from "./tools/delete.js";
import { listProjectResources } from "./tools/list.js";
import { previewScaffold } from "./tools/preview.js";
import { scaffoldResource } from "./tools/scaffold.js";
import {
  addFieldSchema,
  deleteResourceSchema,
  listResourcesSchema,
  scaffoldResourceSchema
} from "./types.js";

const projectRoot = resolveProjectRootFromProcess(process.argv.slice(2), process.cwd(), process.env);

export function createServer() {
  const server = new McpServer({
    name: "mern-mcp",
    version: "0.1.0"
  });

  server.registerTool(
    "scaffold_resource",
    {
      title: "Scaffold MERN Resource",
      description:
        "Generate a full MERN CRUD slice for one resource and either preview or apply the write plan.",
      inputSchema: scaffoldResourceSchema.shape
    },
    async (input) => scaffoldResource(projectRoot, input)
  );

  server.registerTool(
    "preview_scaffold",
    {
      title: "Preview MERN Scaffold",
      description: "Preview the generated files and integration edits for a MERN resource scaffold.",
      inputSchema: scaffoldResourceSchema.shape
    },
    async (input) => previewScaffold(projectRoot, input)
  );

  server.registerTool(
    "list_resources",
    {
      title: "List Managed Resources",
      description: "List manifest-managed resources and optionally scan for unmanaged ones.",
      inputSchema: listResourcesSchema.shape
    },
    async (input) => listProjectResources(projectRoot, input)
  );

  server.registerTool(
    "delete_resource",
    {
      title: "Delete Generated Resource",
      description: "Preview or apply deletion for a manifest-managed generated resource.",
      inputSchema: deleteResourceSchema.shape
    },
    async (input) => deleteResource(projectRoot, input)
  );

  server.registerTool(
    "add_field",
    {
      title: "Add Field to Resource",
      description: "Preview or apply a new field on an existing manifest-managed resource.",
      inputSchema: addFieldSchema.shape
    },
    async (input) => addField(projectRoot, input)
  );

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`mern-mcp running on stdio for project root: ${projectRoot}`);
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectExecution) {
  main().catch((error) => {
    console.error("mern-mcp failed:", error);
    process.exit(1);
  });
}
