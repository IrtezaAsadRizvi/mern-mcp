import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createTempFixture, readProjectFile } from "./helpers.js";
import { addField } from "../src/tools/addField.js";
import { deleteResource } from "../src/tools/delete.js";
import { listProjectResources } from "../src/tools/list.js";
import { previewScaffold } from "../src/tools/preview.js";
import { scaffoldResource } from "../src/tools/scaffold.js";

const productFields = [
  { name: "title", type: "string", required: true },
  { name: "price", type: "number", required: true },
  { name: "inStock", type: "boolean", required: false }
];

describe("tool lifecycle", () => {
  it("previews and applies a scaffold, then lists, updates, and deletes it", async () => {
    const fixture = await createTempFixture("monorepo-ts-react-query");

    try {
      const preview = await previewScaffold(fixture.projectRoot, {
        resourceName: "Product",
        fields: productFields
      });

      expect(preview.structuredContent.artifacts.some((artifact: { path: string }) => artifact.path === "server/models/product.model.ts")).toBe(true);
      expect(preview.structuredContent.artifacts.some((artifact: { path: string; kind: string }) => artifact.path === "server/index.ts" && artifact.kind === "integration")).toBe(true);
      expect(preview.structuredContent.artifacts.some((artifact: { path: string; kind: string }) => artifact.path === "client/router.tsx" && artifact.kind === "integration")).toBe(true);

      const applied = await scaffoldResource(fixture.projectRoot, {
        resourceName: "Product",
        fields: productFields,
        mode: "apply",
        previewHash: preview.structuredContent.previewHash,
        conflictStrategy: "abort"
      });

      expect(applied.structuredContent.writeResult).not.toBeNull();
      expect(applied.structuredContent.writeResult!.written.length).toBeGreaterThan(0);

      const manifestPath = path.join(fixture.projectRoot, ".mern-mcp-manifest.json");
      expect(existsSync(manifestPath)).toBe(true);

      const serverEntry = await readProjectFile(fixture.projectRoot, "server/index.ts");
      expect(serverEntry).toContain('app.use("/api/products", productRoutes);');

      const clientRouter = await readProjectFile(fixture.projectRoot, "client/router.tsx");
      expect(clientRouter).toContain('/products');
      expect(clientRouter).toContain("ProductList");

      const listed = await listProjectResources(fixture.projectRoot, { includeUnmanaged: true });
      expect(listed.structuredContent.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: "manifest",
            resourceName: "Product"
          })
        ])
      );

      const addFieldPreview = await addField(fixture.projectRoot, {
        resourceName: "Product",
        field: { name: "sku", type: "string", required: true },
        mode: "preview"
      });

      const addFieldApplied = await addField(fixture.projectRoot, {
        resourceName: "Product",
        field: { name: "sku", type: "string", required: true },
        mode: "apply",
        previewHash: addFieldPreview.structuredContent.previewHash,
        conflictStrategy: "abort"
      });

      expect(addFieldApplied.structuredContent.writeResult).not.toBeNull();
      expect(addFieldApplied.structuredContent.writeResult!.written.length).toBeGreaterThan(0);
      const modelFile = await readProjectFile(fixture.projectRoot, "server/models/product.model.ts");
      expect(modelFile).toContain("sku");

      const deletePreview = await deleteResource(fixture.projectRoot, {
        resourceName: "Product",
        mode: "preview"
      });

      const deleted = await deleteResource(fixture.projectRoot, {
        resourceName: "Product",
        mode: "apply",
        previewHash: deletePreview.structuredContent.previewHash,
        conflictStrategy: "abort"
      });

      expect(deleted.structuredContent.writeResult).not.toBeNull();
      expect(deleted.structuredContent.writeResult!.deleted).toContain("server/models/product.model.ts");
      expect(existsSync(path.join(fixture.projectRoot, "server/models/product.model.ts"))).toBe(false);

      const updatedServerEntry = await readProjectFile(fixture.projectRoot, "server/index.ts");
      expect(updatedServerEntry).not.toContain("productRoutes");
    } finally {
      await fixture.cleanup();
    }
  });
});
