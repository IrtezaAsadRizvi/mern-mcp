import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FileArtifact, WriteResult } from "../types.js";

export async function readTextIfExists(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), {
    recursive: true
  });
}

export async function writeArtifacts(
  artifacts: FileArtifact[],
  conflictStrategy: "abort" | "overwrite" | "skip"
): Promise<WriteResult> {
  const result: WriteResult = {
    written: [],
    skipped: [],
    deleted: []
  };

  for (const artifact of artifacts) {
    if (artifact.action === "skip") {
      result.skipped.push(artifact.relativePath);
      continue;
    }

    if (artifact.action === "delete") {
      await unlink(artifact.path).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      });
      result.deleted.push(artifact.relativePath);
      continue;
    }

    if (artifact.action === "update" && conflictStrategy === "skip") {
      result.skipped.push(artifact.relativePath);
      continue;
    }

    await ensureParent(artifact.path);
    await writeFile(artifact.path, artifact.content ?? "", "utf8");
    result.written.push(artifact.relativePath);
  }

  return result;
}
