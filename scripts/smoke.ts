import { mkdtemp, cp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const fixtureRoot = path.resolve("test/fixtures/monorepo-ts-react-query");
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "mern-mcp-smoke-"));
  const client = new Client({
    name: "mern-mcp-smoke",
    version: "0.1.0"
  });

  try {
    await cp(fixtureRoot, projectRoot, { recursive: true });

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.resolve("dist/index.js"), "--project-root", projectRoot],
      cwd: path.resolve(".")
    });

    await client.connect(transport);

    const tools = await client.listTools();
    if (tools.tools.length < 5) {
      throw new Error(`Expected at least 5 tools, received ${tools.tools.length}`);
    }

    const preview = await client.callTool({
      name: "preview_scaffold",
      arguments: {
        resourceName: "SmokeProduct",
        fields: [
          { name: "title", type: "string", required: true },
          { name: "price", type: "number", required: true }
        ]
      }
    });

    if (!preview.structuredContent || typeof preview.structuredContent !== "object") {
      throw new Error("Smoke preview did not return structured content");
    }

    console.log("Smoke test passed");
  } finally {
    await client.close().catch(() => undefined);
    await rm(projectRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
