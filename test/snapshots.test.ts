import { describe, expect, it } from "vitest";

import { createTempFixture } from "./helpers.js";
import { previewScaffold } from "../src/tools/preview.js";

function sanitizeSnapshot(value: Record<string, any>) {
  return {
    ...value,
    previewHash: "<previewHash>",
    integrationActions: value.integrationActions.map((action: Record<string, any>) => ({
      ...action,
      path: action.path ? "<absolute-path>" : action.path
    }))
  };
}

describe("scaffold snapshots", () => {
  it("matches the JavaScript plain-react output plan", async () => {
    const fixture = await createTempFixture("monorepo-js-plain");

    try {
      const preview = await previewScaffold(fixture.projectRoot, {
        resourceName: "Inventory Item",
        fields: [
          { name: "name", type: "string", required: true },
          { name: "quantity", type: "number", required: true }
        ]
      });

      expect(sanitizeSnapshot(preview.structuredContent)).toMatchSnapshot();
    } finally {
      await fixture.cleanup();
    }
  });

  it("matches the Redux + auth output plan", async () => {
    const fixture = await createTempFixture("separate-ts-redux");

    try {
      const preview = await previewScaffold(fixture.projectRoot, {
        resourceName: "Order",
        fields: [
          { name: "status", type: "string", required: true, enumValues: ["draft", "placed", "shipped"] },
          { name: "customer", type: "objectId", required: true, ref: "User" }
        ]
      });

      expect(sanitizeSnapshot(preview.structuredContent)).toMatchSnapshot();
    } finally {
      await fixture.cleanup();
    }
  });
});
