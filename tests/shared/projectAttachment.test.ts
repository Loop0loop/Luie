import { describe, expect, it } from "vitest";
import {
  getReadableLuieAttachmentPath,
  getReadableProjectAttachmentPath,
  hasReadableLuieAttachment,
  isBrokenAttachmentStatus,
  isLuieAttachmentPath,
} from "../../src/shared/projectAttachment.js";

describe("projectAttachment helpers", () => {
  it("accepts readable attachments and rejects broken attachment states", () => {
    expect(
      getReadableProjectAttachmentPath({
        projectPath: "/tmp/novel.luie",
        attachmentStatus: "attached",
      }),
    ).toBe("/tmp/novel.luie");

    expect(
      getReadableProjectAttachmentPath({
        projectPath: "/tmp/novel.luie",
        attachmentStatus: "missing-attachment",
      }),
    ).toBeNull();

    expect(
      getReadableProjectAttachmentPath({
        projectPath: "/tmp/novel.luie",
        attachmentStatus: "invalid-attachment",
      }),
    ).toBeNull();
  });

  it("narrows readable .luie attachments only", () => {
    expect(
      getReadableLuieAttachmentPath({
        projectPath: "/tmp/novel.luie",
        attachmentStatus: "attached",
      }),
    ).toBe("/tmp/novel.luie");

    expect(
      getReadableLuieAttachmentPath({
        projectPath: "/tmp/notes.md",
        attachmentStatus: "attached",
      }),
    ).toBeNull();

    expect(
      hasReadableLuieAttachment({
        projectPath: "/tmp/notes.md",
        attachmentStatus: "attached",
      }),
    ).toBe(false);
  });

  it("falls back to path shape when attachment status is not hydrated yet", () => {
    expect(
      getReadableLuieAttachmentPath({
        projectPath: "/tmp/imported.luie",
      }),
    ).toBe("/tmp/imported.luie");
  });

  it("exposes reusable predicates", () => {
    expect(isBrokenAttachmentStatus("missing-attachment")).toBe(true);
    expect(isBrokenAttachmentStatus("detached")).toBe(false);
    expect(isLuieAttachmentPath("/tmp/novel.luie")).toBe(true);
    expect(isLuieAttachmentPath("/tmp/novel.md")).toBe(false);
  });
});
