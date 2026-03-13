import { describe, expect, it } from "vitest";
import { parseStructuredAttributes } from "../../src/renderer/src/features/research/utils/parseStructuredAttributes.js";

describe("parseStructuredAttributes", () => {
  it("returns an object for null-like serialized attributes", () => {
    expect(parseStructuredAttributes("null")).toEqual({});
    expect(parseStructuredAttributes(null)).toEqual({});
    expect(parseStructuredAttributes("[]")).toEqual({});
  });

  it("keeps valid object payloads", () => {
    expect(
      parseStructuredAttributes('{"templateId":"basic","sections":[{"id":"a"}]}'),
    ).toEqual({
      templateId: "basic",
      sections: [{ id: "a" }],
    });
  });
});
