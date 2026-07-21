import { lstat, readlink, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const skillNames = [
  "backend-agent",
  "commit",
  "debug-agent",
  "frontend-agent",
  "mobile-agent",
  "orchestrator",
  "pm-agent",
  "qa-agent",
  "workflow-guide",
] as const;

describe("GitHub skill links", () => {
  it.each(skillNames)("resolves %s to its shared skill directory", async (name) => {
    const linkPath = path.join(repositoryRoot, ".github", "skills", name);

    expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
    expect(await readlink(linkPath)).toBe(`../../.agents/skills/${name}`);
    expect((await stat(linkPath)).isDirectory()).toBe(true);
  });
});
