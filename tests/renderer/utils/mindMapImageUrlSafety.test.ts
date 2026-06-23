import { describe, expect, it } from "vitest";
import { normalizeSafeMindMapImageUrl } from "../../../src/renderer/src/features/research/components/world/mindMapImageUrlSafety.js";

describe("normalizeSafeMindMapImageUrl", () => {
  it.each([
    "https://example.com/image.png",
    "http://localhost:3000/image.webp",
    "data:image/png;base64,aGVsbG8=",
    "data:image/jpeg;base64,aGVsbG8=",
    "data:image/webp;base64,aGVsbG8=",
    "data:image/gif;base64,aGVsbG8=",
  ])("allows safe image URL %s", (input) => {
    expect(normalizeSafeMindMapImageUrl(input)).toBe(input);
  });

  it.each([
    "javascript:alert(1)",
    " file:///Users/user/a.png ",
    "blob:https://example.com/id",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "data:text/html;base64,PGgxPm5vPC9oMT4=",
    "https://example.com/image.png\njavascript:alert(1)",
  ])("rejects unsafe image URL %s", (input) => {
    expect(normalizeSafeMindMapImageUrl(input)).toBeNull();
  });
});
