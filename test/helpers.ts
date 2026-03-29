import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function createTempFixture(fixtureName: string) {
  const sourceRoot = path.resolve("test/fixtures", fixtureName);
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "mern-mcp-"));

  await cp(sourceRoot, tempRoot, {
    recursive: true
  });

  return {
    projectRoot: tempRoot,
    async cleanup() {
      await rm(tempRoot, {
        recursive: true,
        force: true
      });
    }
  };
}

export async function readProjectFile(projectRoot: string, relativePath: string) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}
