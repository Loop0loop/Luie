import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_EMBEDDING_MODEL } from "../../../src/main/services/features/llm/embeddingModelConstants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

describe("embeddingModelConstants", () => {
  it("defines a valid bge-m3 model definition", () => {
    expect(DEFAULT_EMBEDDING_MODEL.repo).toBe("gpustack/bge-m3-GGUF");
    expect(DEFAULT_EMBEDDING_MODEL.filename).toMatch(/\.gguf$/);
    expect(DEFAULT_EMBEDDING_MODEL.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(DEFAULT_EMBEDDING_MODEL.sizeBytes).toBeGreaterThan(0);
    expect(DEFAULT_EMBEDDING_MODEL.dimension).toBe(1024);
  });

  it("matches the build staging script metadata", () => {
    const scriptPath = path.join(
      repoRoot,
      "scripts",
      "stage-embedding-model.mjs",
    );
    const script = fs.readFileSync(scriptPath, "utf-8");

    expect(script).toContain(DEFAULT_EMBEDDING_MODEL.repo);
    expect(script).toContain(DEFAULT_EMBEDDING_MODEL.filename);
    expect(script).toContain(DEFAULT_EMBEDDING_MODEL.sha256);
    // NOTE: size literal의 `_` 구분자는 값 비교 전에 제거한다.
    const normalized = script.replace(/_/g, "");
    expect(normalized).toContain(String(DEFAULT_EMBEDDING_MODEL.sizeBytes));
  });

  it("matches the electron-builder bundling target", () => {
    const builderPath = path.join(repoRoot, "electron-builder.json");
    const builder = JSON.parse(fs.readFileSync(builderPath, "utf-8")) as {
      extraResources?: Array<{ from?: string; to?: string; filter?: string[] }>;
    };
    const modelEntry = (builder.extraResources ?? []).find(
      (entry) => entry.from === "resources/models",
    );
    expect(modelEntry).toBeDefined();
    expect(modelEntry?.to).toBe("models");
  });
});
