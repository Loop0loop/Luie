import { describe, expect, it } from "vitest";
import { sanitizePreviewHtml } from "../../../src/renderer/src/utils/sanitizeHtml.js";

describe("sanitizePreviewHtml", () => {
  it("removes blocked tags", () => {
    const input = `<div>safe<script>alert(1)</script><iframe src="https://evil.com"></iframe></div>`;
    const output = sanitizePreviewHtml(input);

    expect(output).toContain("safe");
    expect(output.toLowerCase()).not.toContain("<script");
    expect(output.toLowerCase()).not.toContain("<iframe");
  });

  it("removes inline event handlers and javascript urls", () => {
    const input = `<a onclick="hack()" href="javascript:alert(1)">link</a><img src=javascript:alert(1) onerror='hack()' />`;
    const output = sanitizePreviewHtml(input);

    expect(output.toLowerCase()).not.toContain("onclick=");
    expect(output.toLowerCase()).not.toContain("onerror=");
    expect(output.toLowerCase()).not.toContain("javascript:");
  });

  it("keeps safe attributes", () => {
    const input = `<a href="https://example.com">ok</a><img src="https://example.com/image.png" alt="img" />`;
    const output = sanitizePreviewHtml(input);

    expect(output).toContain(`href="https://example.com"`);
    expect(output).toContain(`src="https://example.com/image.png"`);
    expect(output).toContain("ok");
  });
});
