import { describe, expect, it } from "vitest";

import { parseDescriptionToFields } from "../src/utils/description.js";

describe("description parsing", () => {
  it("normalizes simple list-style descriptions", () => {
    const fields = parseDescriptionToFields("a blog post with title, body, author, tags");

    expect(fields).toEqual([
      expect.objectContaining({ name: "Title", type: "string", required: true }),
      expect.objectContaining({ name: "Body", type: "string", required: true }),
      expect.objectContaining({ name: "Author", type: "objectId", ref: "Author", required: true }),
      expect.objectContaining({ name: "Tags", type: "string", isArray: true, required: true })
    ]);
  });
});
