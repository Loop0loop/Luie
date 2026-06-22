import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rendererIndexHtml = readFileSync(
  path.join(repoRoot, "src/renderer/index.html"),
  "utf-8",
);

const extractCsp = (): string => {
  const match = rendererIndexHtml.match(
    /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/,
  );
  return match?.[1] ?? "";
};

const csp = extractCsp();

describe("renderer CSP policy", () => {
  it("keeps remote code and broad network defaults out of renderer index", () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toMatch(/default-src[^;]*(?:https?:|data:|blob:|file:)/);
    expect(csp).not.toMatch(/script-src[^;]*(?:https?:|blob:|file:)/);
    expect(csp).not.toMatch(/connect-src[^;]*(?:https:|wss:|http:(?!\/\/(?:localhost|127\.0\.0\.1):5173))/);
  });

  it("allows only renderer-required image and dev-server sources", () => {
    expect(csp).toContain("img-src 'self' data: https:");
    expect(csp).toContain("http://localhost:5173");
    expect(csp).toContain("ws://localhost:5173");
    expect(csp).not.toMatch(/img-src[^;]*(?:blob:|file:)/);
  });
});
