import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolvePaths, loadProjectConfig } from "../src/utils/config.js";

describe("config loading", () => {
  it("uses defaults when no config file exists", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "mern-mcp-empty-"));

    try {
      const config = loadProjectConfig(tempRoot);
      const resolved = resolvePaths(tempRoot, config);

      expect(config.language).toBe("typescript");
      expect(resolved.serverRoot).toBe(path.join(tempRoot, "server"));
      expect(resolved.clientRoot).toBe(path.join(tempRoot, "client"));
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("resolves overridden artifact directories", () => {
    const projectRoot = path.resolve("test/fixtures/separate-ts-redux");
    const config = loadProjectConfig(projectRoot);
    const resolved = resolvePaths(projectRoot, config);

    expect(resolved.modelsDir).toBe(path.join(projectRoot, "server", "src/models"));
    expect(resolved.clientStore).toBe(path.join(projectRoot, "client", "src/store.ts"));
  });
});
