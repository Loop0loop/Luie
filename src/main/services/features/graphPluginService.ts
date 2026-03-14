import * as fsp from "node:fs/promises";
import path from "node:path";
import type {
  GraphPluginApplyTemplateInput,
  GraphPluginCatalogItem,
  GraphPluginInstallResult,
  GraphPluginTemplateRef,
  InstalledGraphPlugin,
} from "../../../shared/types/index.js";
import {
  assertCatalogCompatibility,
  sanitizeCatalogItem,
  type GraphPluginServiceDependencies,
} from "./graphPlugin/shared.js";
import {
  createGraphPluginPaths,
  prepareTempDirectory,
  readCatalog,
  readInstalledIndexValidated,
  removeLegacyVersions,
  writeInstalledIndex,
} from "./graphPlugin/repository.js";
import {
  downloadPluginArchive,
  extractPluginArchive,
  readGraphDocument,
  readPluginManifest,
  resolveExtractedPackageRoot,
} from "./graphPlugin/archive.js";
import {
  assertManifestMatchesCatalog,
  validateTemplateDocuments,
} from "./graphPlugin/validation.js";
import { replaceProjectWorldEntityGraph } from "./graphPlugin/apply.js";
import { worldReplicaService } from "./worldReplicaService.js";
import { createServiceError } from "./graphPlugin/shared.js";
import { ErrorCode } from "../../../shared/constants/index.js";

export class GraphPluginService {
  private readonly fetchImpl: typeof fetch;

  private readonly paths: ReturnType<typeof createGraphPluginPaths>;

  private readonly now: () => Date;

  private readonly replicaService: Pick<typeof worldReplicaService, "setDocument">;

  private readonly applyGraphTemplate: (
    projectId: string,
    graphPayload: Awaited<ReturnType<typeof readGraphDocument>>,
  ) => Promise<void>;

  constructor(deps: GraphPluginServiceDependencies = {}) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.paths = createGraphPluginPaths(
      deps.pluginRootDir ?? path.join(process.cwd(), "plugin"),
    );
    this.now = deps.now ?? (() => new Date());
    this.replicaService = deps.worldReplicaService ?? worldReplicaService;
    this.applyGraphTemplate =
      deps.applyGraphTemplate ??
      ((projectId, graphPayload) =>
        replaceProjectWorldEntityGraph(projectId, graphPayload, this.now()));
  }

  async listCatalog(): Promise<GraphPluginCatalogItem[]> {
    const items = await readCatalog(this.paths.getRegistryPath());
    return items.map(sanitizeCatalogItem);
  }

  async listInstalled(): Promise<InstalledGraphPlugin[]> {
    const { entries, changed } = await readInstalledIndexValidated(
      this.paths.getInstalledIndexPath(),
      this.paths.getInstalledVersionDir,
    );
    if (changed) {
      await writeInstalledIndex(
        this.paths.getInstalledRoot(),
        this.paths.getInstalledIndexPath(),
        entries,
      );
    }
    return entries;
  }

  async install(pluginId: string): Promise<GraphPluginInstallResult> {
    const catalog = await readCatalog(this.paths.getRegistryPath());
    const item = catalog.find((candidate) => candidate.pluginId === pluginId);
    if (!item) {
      throw createServiceError(
        ErrorCode.PROJECT_NOT_FOUND,
        "Graph plugin catalog entry not found",
        { pluginId },
      );
    }

    assertCatalogCompatibility(item);

    const installed = await readInstalledIndexValidated(
      this.paths.getInstalledIndexPath(),
      this.paths.getInstalledVersionDir,
    );
    const current = installed.entries.find((candidate) => candidate.pluginId === pluginId);
    if (current && current.version === item.version) {
      return {
        pluginId,
        version: current.version,
        installedAt: current.installedAt,
        status: current.status,
        alreadyInstalled: true,
      };
    }

    const archive = await downloadPluginArchive(
      this.fetchImpl,
      path.dirname(this.paths.getRegistryPath()),
      item,
      process.env.NODE_ENV === "production",
    );

    const tempRoot = await prepareTempDirectory(this.paths.getTempRoot());
    const extractRoot = path.join(tempRoot, "extract");
    await fsp.mkdir(extractRoot, { recursive: true });

    try {
      await extractPluginArchive(archive, extractRoot);
      const packageRoot = await resolveExtractedPackageRoot(extractRoot);
      const manifest = await readPluginManifest(packageRoot);

      assertManifestMatchesCatalog(item, manifest);
      await validateTemplateDocuments(packageRoot, manifest);

      const installedAt = this.now().toISOString();
      const finalDir = this.paths.getInstalledVersionDir(pluginId, item.version);
      await fsp.mkdir(path.dirname(finalDir), { recursive: true });
      await fsp.rm(finalDir, { recursive: true, force: true });
      await fsp.rename(packageRoot, finalDir);

      const nextEntries = installed.entries.filter(
        (candidate) => candidate.pluginId !== pluginId,
      );
      nextEntries.push({
        pluginId: manifest.id,
        version: manifest.version,
        name: manifest.name,
        description: manifest.description,
        author: manifest.author,
        apiVersion: manifest.apiVersion,
        kind: manifest.kind,
        installedAt,
        source: {
          assetUrl: item.assetUrl,
          sha256: item.sha256,
        },
        status: "installed",
      });

      await writeInstalledIndex(
        this.paths.getInstalledRoot(),
        this.paths.getInstalledIndexPath(),
        nextEntries,
      );
      await removeLegacyVersions(
        this.paths.getInstalledPluginDir(pluginId),
        manifest.version,
      );

      return {
        pluginId: manifest.id,
        version: manifest.version,
        installedAt,
        status: "installed",
        alreadyInstalled: false,
      };
    } finally {
      await fsp.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async uninstall(pluginId: string): Promise<void> {
    const installed = await readInstalledIndexValidated(
      this.paths.getInstalledIndexPath(),
      this.paths.getInstalledVersionDir,
    );
    const entry = installed.entries.find((candidate) => candidate.pluginId === pluginId);
    if (!entry) return;

    await fsp.rm(this.paths.getInstalledPluginDir(pluginId), {
      recursive: true,
      force: true,
    });

    await writeInstalledIndex(
      this.paths.getInstalledRoot(),
      this.paths.getInstalledIndexPath(),
      installed.entries.filter((candidate) => candidate.pluginId !== pluginId),
    );
  }

  async getTemplates(): Promise<GraphPluginTemplateRef[]> {
    const installed = await this.listInstalled();
    const manifests = await Promise.all(
      installed.map((plugin) =>
        readPluginManifest(
          this.paths.getInstalledVersionDir(plugin.pluginId, plugin.version),
        ),
      ),
    );

    return installed.flatMap((plugin, index) =>
      manifests[index].templates.map((template) => ({
        pluginId: plugin.pluginId,
        pluginName: plugin.name,
        pluginVersion: plugin.version,
        pluginDescription: plugin.description,
        pluginAuthor: plugin.author,
        template,
      })),
    );
  }

  async applyTemplate(input: GraphPluginApplyTemplateInput): Promise<void> {
    const installed = await this.listInstalled();
    const plugin = installed.find((candidate) => candidate.pluginId === input.pluginId);
    if (!plugin) {
      throw createServiceError(
        ErrorCode.PROJECT_NOT_FOUND,
        "Installed graph plugin not found",
        { ...input },
      );
    }

    const manifest = await readPluginManifest(
      this.paths.getInstalledVersionDir(plugin.pluginId, plugin.version),
    );
    const template = manifest.templates.find((candidate) => candidate.id === input.templateId);
    if (!template) {
      throw createServiceError(
        ErrorCode.PROJECT_NOT_FOUND,
        "Graph plugin template not found",
        { ...input },
      );
    }

    const graphPayload = await readGraphDocument(
      this.paths.getInstalledVersionDir(plugin.pluginId, plugin.version),
      template.graphEntry,
    );

    await this.applyGraphTemplate(input.projectId, graphPayload);
    await this.replicaService.setDocument({
      projectId: input.projectId,
      docType: "graph",
      payload: graphPayload,
    });
  }
}

export const graphPluginService = new GraphPluginService();
