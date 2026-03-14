import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import rawFs from "node:fs";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import yazl from "yazl";

const mocked = vi.hoisted(() => ({
  db: {
    getClient: vi.fn(),
  },
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: mocked.db,
}));

const loadGraphPluginServiceModule = () =>
  import("../../../src/main/services/features/graphPluginService.js");

const baseManifest = {
  id: "foundation-graph",
  name: "Foundation Graph",
  version: "1.0.0",
  apiVersion: "1.0.0",
  kind: "graph-template-bundle",
  description: "Starter graph templates",
  author: "Luie Team",
  templates: [
    {
      id: "kingdom-foundation",
      title: "Kingdom Foundation",
      summary: "Starter graph",
      thumbnail: "assets/thumb.svg",
      graphEntry: "templates/kingdom.graph.json",
      tags: ["starter"],
    },
  ],
};

const baseGraph = {
  nodes: [
    {
      id: "6c9366f7-77d9-4f3b-a93c-b8b0bc0bb001",
      entityType: "Place",
      subType: "Place",
      name: "Capital City",
      positionX: 10,
      positionY: 10,
    },
  ],
  edges: [],
  updatedAt: "2026-03-15T00:00:00.000Z",
};

const writePluginArchive = async (
  pluginRoot: string,
  entries: Record<string, string>,
) => {
  const distDir = path.join(pluginRoot, "packages", "foundation-graph", "dist");
  await fs.mkdir(distDir, { recursive: true });
  const zipPath = path.join(distDir, "foundation-graph-1.0.0.zip");
  const zipfile = new yazl.ZipFile();
  Object.entries(entries).forEach(([entryPath, content]) => {
    zipfile.addBuffer(Buffer.from(content, "utf-8"), entryPath);
  });

  await new Promise<void>((resolve, reject) => {
    zipfile.outputStream
      .pipe(rawFs.createWriteStream(zipPath))
      .on("close", () => resolve())
      .on("error", reject);
    zipfile.end();
  });

  const buffer = await fs.readFile(zipPath);
  return {
    zipPath,
    size: buffer.byteLength,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
};

const writeUnsafePluginArchive = async (
  pluginRoot: string,
  entries: Record<string, string>,
) => {
  const distDir = path.join(pluginRoot, "packages", "foundation-graph", "dist");
  await fs.mkdir(distDir, { recursive: true });
  const zipPath = path.join(distDir, "foundation-graph-1.0.0.zip");
  const zip = new JSZip();
  Object.entries(entries).forEach(([entryPath, content]) => {
    zip.file(entryPath, content);
  });
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await fs.writeFile(zipPath, buffer);
  return {
    zipPath,
    size: buffer.byteLength,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
};

const writeCatalog = async (
  pluginRoot: string,
  override: Partial<{ sha256: string; size: number; devAssetPath: string }> = {},
) => {
  const defaultEntries = {
    "plugin.json": JSON.stringify(baseManifest, null, 2),
    "templates/kingdom.graph.json": JSON.stringify(baseGraph, null, 2),
    "assets/thumb.svg": "<svg />",
  };
  const archive = await writePluginArchive(pluginRoot, defaultEntries);
  await fs.mkdir(path.join(pluginRoot, "registry"), { recursive: true });
  await fs.mkdir(path.join(pluginRoot, "installed"), { recursive: true });
  await fs.writeFile(
    path.join(pluginRoot, "installed", "index.json"),
    "[]",
    "utf-8",
  );
  await fs.writeFile(
    path.join(pluginRoot, "registry", "catalog.json"),
    JSON.stringify(
      [
        {
          pluginId: "foundation-graph",
          version: "1.0.0",
          name: "Foundation Graph",
          summary: "Starter graph templates",
          releaseTag: "foundation-graph-v1.0.0",
          assetUrl:
            "https://github.com/luie-team/luie/releases/download/foundation-graph-v1.0.0/foundation-graph-1.0.0.zip",
          devAssetPath:
            override.devAssetPath ??
            "packages/foundation-graph/dist/foundation-graph-1.0.0.zip",
          sha256: override.sha256 ?? archive.sha256,
          size: override.size ?? archive.size,
          minAppVersion: "0.1.0",
          apiVersion: "1.0.0",
        },
      ],
      null,
      2,
    ),
    "utf-8",
  );

  return archive;
};

describe("GraphPluginService", () => {
  let tempDir: string;
  let serviceModule: Awaited<ReturnType<typeof loadGraphPluginServiceModule>>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "luie-plugin-test-"));
    serviceModule = await loadGraphPluginServiceModule();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("installs a plugin archive and exposes templates", async () => {
    await writeCatalog(tempDir);
    const setDocument = vi.fn(async () => undefined);
    const service = new serviceModule.GraphPluginService({
      pluginRootDir: tempDir,
      worldReplicaService: { setDocument },
      applyGraphTemplate: vi.fn(async () => undefined),
      now: () => new Date("2026-03-15T09:00:00.000Z"),
    });

    const result = await service.install("foundation-graph");
    const installed = await service.listInstalled();
    const templates = await service.getTemplates();

    expect(result).toEqual({
      pluginId: "foundation-graph",
      version: "1.0.0",
      installedAt: "2026-03-15T09:00:00.000Z",
      status: "installed",
      alreadyInstalled: false,
    });
    expect(installed).toHaveLength(1);
    expect(templates).toHaveLength(1);
    expect(templates[0]?.template.id).toBe("kingdom-foundation");
    expect(setDocument).not.toHaveBeenCalled();
  });

  it("rejects archives with sha256 mismatches", async () => {
    await writeCatalog(tempDir, { sha256: "1".repeat(64) });
    const service = new serviceModule.GraphPluginService({
      pluginRootDir: tempDir,
      worldReplicaService: { setDocument: vi.fn(async () => undefined) },
      applyGraphTemplate: vi.fn(async () => undefined),
    });

    await expect(service.install("foundation-graph")).rejects.toThrow(
      "Graph plugin archive hash mismatch",
    );
  });

  it("blocks zip path traversal during install", async () => {
    const archive = await writeUnsafePluginArchive(tempDir, {
      "../escape.txt": "nope",
      "plugin.json": JSON.stringify(baseManifest, null, 2),
      "templates/kingdom.graph.json": JSON.stringify(baseGraph, null, 2),
    });
    await fs.mkdir(path.join(tempDir, "registry"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "installed"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "installed", "index.json"), "[]", "utf-8");
    await fs.writeFile(
      path.join(tempDir, "registry", "catalog.json"),
      JSON.stringify(
        [
          {
            pluginId: "foundation-graph",
            version: "1.0.0",
            name: "Foundation Graph",
            summary: "Starter graph templates",
            releaseTag: "foundation-graph-v1.0.0",
            assetUrl: "https://example.com/foundation-graph.zip",
            devAssetPath: "packages/foundation-graph/dist/foundation-graph-1.0.0.zip",
            sha256: archive.sha256,
            size: archive.size,
            minAppVersion: "0.1.0",
            apiVersion: "1.0.0",
          },
        ],
        null,
        2,
      ),
      "utf-8",
    );

    const service = new serviceModule.GraphPluginService({
      pluginRootDir: tempDir,
      worldReplicaService: { setDocument: vi.fn(async () => undefined) },
      applyGraphTemplate: vi.fn(async () => undefined),
    });

    await expect(service.install("foundation-graph")).rejects.toThrow(
      "invalid relative path: ../",
    );
  });

  it("rolls back install state when manifest validation fails", async () => {
    const archive = await writePluginArchive(tempDir, {
      "README.md": "missing manifest",
    });
    await fs.mkdir(path.join(tempDir, "registry"), { recursive: true });
    await fs.mkdir(path.join(tempDir, "installed"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "installed", "index.json"), "[]", "utf-8");
    await fs.writeFile(
      path.join(tempDir, "registry", "catalog.json"),
      JSON.stringify(
        [
          {
            pluginId: "foundation-graph",
            version: "1.0.0",
            name: "Foundation Graph",
            summary: "Starter graph templates",
            releaseTag: "foundation-graph-v1.0.0",
            assetUrl: "https://example.com/foundation-graph.zip",
            devAssetPath: "packages/foundation-graph/dist/foundation-graph-1.0.0.zip",
            sha256: archive.sha256,
            size: archive.size,
            minAppVersion: "0.1.0",
            apiVersion: "1.0.0",
          },
        ],
        null,
        2,
      ),
      "utf-8",
    );

    const service = new serviceModule.GraphPluginService({
      pluginRootDir: tempDir,
      worldReplicaService: { setDocument: vi.fn(async () => undefined) },
      applyGraphTemplate: vi.fn(async () => undefined),
    });

    await expect(service.install("foundation-graph")).rejects.toThrow(
      "Graph plugin archive does not contain a package root",
    );

    const installedIndex = JSON.parse(
      await fs.readFile(path.join(tempDir, "installed", "index.json"), "utf-8"),
    );
    expect(installedIndex).toEqual([]);
    await expect(
      fs.access(path.join(tempDir, "installed", "foundation-graph")),
    ).rejects.toBeDefined();
  });

  it("uninstalls plugin directories and index entries", async () => {
    await writeCatalog(tempDir);
    const service = new serviceModule.GraphPluginService({
      pluginRootDir: tempDir,
      worldReplicaService: { setDocument: vi.fn(async () => undefined) },
      applyGraphTemplate: vi.fn(async () => undefined),
    });

    await service.install("foundation-graph");
    await service.uninstall("foundation-graph");

    const installed = await service.listInstalled();
    expect(installed).toEqual([]);
    await expect(
      fs.access(path.join(tempDir, "installed", "foundation-graph")),
    ).rejects.toBeDefined();
  });

  it("applies an installed template through the injected graph writer", async () => {
    await writeCatalog(tempDir);
    const applyGraphTemplate = vi.fn(async () => undefined);
    const setDocument = vi.fn(async () => undefined);
    const service = new serviceModule.GraphPluginService({
      pluginRootDir: tempDir,
      worldReplicaService: { setDocument },
      applyGraphTemplate,
    });

    await service.install("foundation-graph");
    await service.applyTemplate({
      pluginId: "foundation-graph",
      templateId: "kingdom-foundation",
      projectId: "7d3ec34f-c546-4c9c-bf19-b7986f88c6a9",
    });

    expect(applyGraphTemplate).toHaveBeenCalledWith(
      "7d3ec34f-c546-4c9c-bf19-b7986f88c6a9",
      expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ name: "Capital City" }),
        ]),
      }),
    );
    expect(setDocument).toHaveBeenCalledWith({
      projectId: "7d3ec34f-c546-4c9c-bf19-b7986f88c6a9",
      docType: "graph",
      payload: expect.objectContaining({
        nodes: expect.any(Array),
      }),
    });
  });
});
