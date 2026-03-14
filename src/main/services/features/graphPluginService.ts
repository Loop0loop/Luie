import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yauzl from "yauzl";
import { z } from "zod";
import { APP_VERSION, ErrorCode } from "../../../shared/constants/index.js";
import {
  entityRelationIdSchema,
  graphPluginCatalogItemSchema,
  graphPluginManifestSchema,
  installedGraphPluginIndexSchema,
  worldEntityIdSchema,
  worldEntityTypeSchema,
} from "../../../shared/schemas/index.js";
import type {
  GraphPluginApplyTemplateInput,
  GraphPluginCatalogItem,
  GraphPluginInstallResult,
  GraphPluginManifest,
  GraphPluginTemplateRef,
  InstalledGraphPlugin,
  WorldEntitySourceType,
} from "../../../shared/types/index.js";
import { isRelationAllowed } from "../../../shared/constants/worldRelationRules.js";
import { db } from "../../database/index.js";
import { LuieWorldGraphSchema } from "../core/project/projectLuieSchemas.js";
import { worldReplicaService } from "./worldReplicaService.js";
import { ServiceError } from "../../utils/serviceError.js";
import { isSafeZipPath, normalizeZipPath } from "../../utils/luiePackage.js";

const MAX_PLUGIN_ARCHIVE_BYTES = 64 * 1024 * 1024;
const BLOCKED_PLUGIN_EXTENSIONS = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".node",
  ".exe",
  ".bat",
  ".cmd",
  ".ps1",
  ".sh",
  ".dll",
  ".so",
  ".dylib",
]);

const localCatalogItemSchema = graphPluginCatalogItemSchema.extend({
  devAssetPath: z.string().min(1).optional(),
});

type LocalCatalogItem = z.infer<typeof localCatalogItemSchema>;
type InstalledGraphPluginRecord = z.infer<typeof installedGraphPluginIndexSchema>[number];
type GraphDocumentPayload = z.infer<typeof LuieWorldGraphSchema>;

type GraphPluginServiceDependencies = {
  fetchImpl?: typeof fetch;
  pluginRootDir?: string;
  now?: () => Date;
  worldReplicaService?: Pick<typeof worldReplicaService, "setDocument">;
  applyGraphTemplate?: (
    projectId: string,
    graphPayload: GraphDocumentPayload,
  ) => Promise<void>;
};

const compareVersionPart = (left: string, right: string): number => {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const hasMatchingApiMajor = (expected: string, actual: string) =>
  expected.split(".")[0] === actual.split(".")[0];

const isPathInsideRoot = (targetPath: string, rootPath: string) => {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(rootPath);
  return (
    resolvedTarget === resolvedRoot ||
    resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
  );
};

const isHiddenPath = (normalizedPath: string) =>
  normalizedPath.split("/").some((segment) => segment.startsWith("."));

const isSymlinkEntry = (entry: yauzl.Entry) => {
  const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
  return (mode & 0o170000) === 0o120000;
};

const isExecutableEntry = (entry: yauzl.Entry) => {
  const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
  if ((mode & 0o111) !== 0) return true;
  return BLOCKED_PLUGIN_EXTENSIONS.has(path.extname(entry.fileName).toLowerCase());
};

const sanitizeCatalogItem = (
  value: LocalCatalogItem,
): GraphPluginCatalogItem => ({
  pluginId: value.pluginId,
  version: value.version,
  name: value.name,
  summary: value.summary,
  releaseTag: value.releaseTag,
  assetUrl: value.assetUrl,
  sha256: value.sha256,
  size: value.size,
  minAppVersion: value.minAppVersion,
  apiVersion: value.apiVersion,
});

const createServiceError = (
  code: (typeof ErrorCode)[keyof typeof ErrorCode],
  message: string,
  details?: Record<string, unknown>,
  cause?: unknown,
) => new ServiceError(code, message, details, cause);

export class GraphPluginService {
  private readonly fetchImpl: typeof fetch;

  private readonly pluginRootDir: string;

  private readonly now: () => Date;

  private readonly replicaService: Pick<typeof worldReplicaService, "setDocument">;

  private readonly applyGraphTemplate: (
    projectId: string,
    graphPayload: GraphDocumentPayload,
  ) => Promise<void>;

  constructor(deps: GraphPluginServiceDependencies = {}) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.pluginRootDir = deps.pluginRootDir ?? path.join(process.cwd(), "plugin");
    this.now = deps.now ?? (() => new Date());
    this.replicaService = deps.worldReplicaService ?? worldReplicaService;
    this.applyGraphTemplate =
      deps.applyGraphTemplate ??
      ((projectId, graphPayload) =>
        this.replaceProjectWorldEntityGraph(projectId, graphPayload));
  }

  async listCatalog(): Promise<GraphPluginCatalogItem[]> {
    const items = await this.readCatalog();
    return items.map(sanitizeCatalogItem);
  }

  async listInstalled(): Promise<InstalledGraphPlugin[]> {
    const { entries, changed } = await this.readInstalledIndexValidated();
    if (changed) {
      await this.writeInstalledIndex(entries);
    }
    return entries;
  }

  async install(pluginId: string): Promise<GraphPluginInstallResult> {
    const catalog = await this.readCatalog();
    const item = catalog.find((candidate) => candidate.pluginId === pluginId);
    if (!item) {
      throw createServiceError(
        ErrorCode.PROJECT_NOT_FOUND,
        "Graph plugin catalog entry not found",
        { pluginId },
      );
    }

    this.assertCatalogCompatibility(item);

    const installed = await this.readInstalledIndexValidated();
    const current = installed.entries.find((candidate) => candidate.pluginId === pluginId);
    const installedAt = this.now().toISOString();
    if (current && current.version === item.version) {
      return {
        pluginId,
        version: current.version,
        installedAt: current.installedAt,
        status: current.status,
        alreadyInstalled: true,
      };
    }

    const bundleBuffer = await this.downloadPluginArchive(item);
    const digest = createHash("sha256").update(bundleBuffer).digest("hex");
    if (digest !== item.sha256) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph plugin archive hash mismatch",
        { pluginId, expected: item.sha256, actual: digest },
      );
    }

    const tempRoot = await this.prepareTempDirectory();
    const extractRoot = path.join(tempRoot, "extract");
    await fsp.mkdir(extractRoot, { recursive: true });

    try {
      await this.extractPluginArchive(bundleBuffer, extractRoot);
      const packageRoot = await this.resolveExtractedPackageRoot(extractRoot);
      const manifest = await this.readPluginManifest(packageRoot);

      this.assertManifestMatchesCatalog(item, manifest);
      await this.validateTemplateDocuments(packageRoot, manifest);

      const finalDir = this.getInstalledVersionDir(pluginId, item.version);
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
      await this.writeInstalledIndex(nextEntries);
      await this.removeLegacyVersions(pluginId, manifest.version);

      return {
        pluginId: manifest.id,
        version: manifest.version,
        installedAt,
        status: "installed",
        alreadyInstalled: false,
      };
    } catch (error) {
      await fsp.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
      throw error;
    } finally {
      await fsp.rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async uninstall(pluginId: string): Promise<void> {
    const installed = await this.readInstalledIndexValidated();
    const entry = installed.entries.find((candidate) => candidate.pluginId === pluginId);
    if (!entry) return;

    await fsp.rm(this.getInstalledPluginDir(pluginId), {
      recursive: true,
      force: true,
    });

    await this.writeInstalledIndex(
      installed.entries.filter((candidate) => candidate.pluginId !== pluginId),
    );
  }

  async getTemplates(): Promise<GraphPluginTemplateRef[]> {
    const installed = await this.listInstalled();
    const manifests = await Promise.all(
      installed.map((plugin) =>
        this.readInstalledManifest(plugin.pluginId, plugin.version),
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

    const manifest = await this.readInstalledManifest(plugin.pluginId, plugin.version);
    const template = manifest.templates.find((candidate) => candidate.id === input.templateId);
    if (!template) {
      throw createServiceError(
        ErrorCode.PROJECT_NOT_FOUND,
        "Graph plugin template not found",
        { ...input },
      );
    }

    const packageRoot = this.getInstalledVersionDir(plugin.pluginId, plugin.version);
    const graphPayload = await this.readGraphDocument(packageRoot, template.graphEntry);
    await this.applyGraphTemplate(input.projectId, graphPayload);
    await this.replicaService.setDocument({
      projectId: input.projectId,
      docType: "graph",
      payload: graphPayload,
    });
  }

  private getRegistryPath() {
    return path.join(this.pluginRootDir, "registry", "catalog.json");
  }

  private getInstalledRoot() {
    return path.join(this.pluginRootDir, "installed");
  }

  private getInstalledIndexPath() {
    return path.join(this.getInstalledRoot(), "index.json");
  }

  private getInstalledPluginDir(pluginId: string) {
    return path.join(this.getInstalledRoot(), pluginId);
  }

  private getInstalledVersionDir(pluginId: string, version: string) {
    return path.join(this.getInstalledPluginDir(pluginId), version);
  }

  private async prepareTempDirectory() {
    const tempRoot = path.join(this.pluginRootDir, ".tmp");
    await fsp.mkdir(tempRoot, { recursive: true });
    return await fsp.mkdtemp(path.join(tempRoot, "install-"));
  }

  private async readCatalog(): Promise<LocalCatalogItem[]> {
    const raw = await this.readJsonFile(this.getRegistryPath(), []);
    const parsed = z.array(localCatalogItemSchema).safeParse(raw);
    if (!parsed.success) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid graph plugin catalog",
        { issues: parsed.error.issues },
        parsed.error,
      );
    }
    return parsed.data;
  }

  private async readInstalledIndexValidated(): Promise<{
    entries: InstalledGraphPluginRecord[];
    changed: boolean;
  }> {
    const raw = await this.readJsonFile(this.getInstalledIndexPath(), []);
    const parsed = installedGraphPluginIndexSchema.safeParse(raw);
    if (!parsed.success) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid installed graph plugin index",
        { issues: parsed.error.issues },
        parsed.error,
      );
    }

    const manifestChecks = await Promise.all(
      parsed.data.map(async (entry) => {
        const manifestPath = path.join(
          this.getInstalledVersionDir(entry.pluginId, entry.version),
          "plugin.json",
        );
        try {
          await fsp.access(manifestPath);
          return entry;
        } catch {
          return null;
        }
      }),
    );
    const entries = manifestChecks.filter(
      (entry): entry is InstalledGraphPluginRecord => entry !== null,
    );
    const changed = entries.length !== parsed.data.length;

    return { entries, changed };
  }

  private async writeInstalledIndex(entries: InstalledGraphPluginRecord[]) {
    const installedRoot = this.getInstalledRoot();
    await fsp.mkdir(installedRoot, { recursive: true });
    const targetPath = this.getInstalledIndexPath();
    const tempPath = `${targetPath}.tmp`;
    await fsp.writeFile(tempPath, JSON.stringify(entries, null, 2), "utf-8");
    await fsp.rename(tempPath, targetPath);
  }

  private async downloadPluginArchive(item: LocalCatalogItem): Promise<Buffer> {
    const localPath =
      item.devAssetPath && !this.isPackaged()
        ? path.resolve(this.pluginRootDir, item.devAssetPath)
        : item.assetUrl.startsWith("file://")
          ? fileURLToPath(item.assetUrl)
          : null;

    if (localPath) {
      const buffer = await fsp.readFile(localPath);
      if (buffer.byteLength > MAX_PLUGIN_ARCHIVE_BYTES) {
        throw createServiceError(
          ErrorCode.FS_READ_FAILED,
          "Graph plugin archive is too large",
          { pluginId: item.pluginId, size: buffer.byteLength },
        );
      }
      return buffer;
    }

    const response = await this.fetchImpl(item.assetUrl, { method: "GET" }).catch((error) => {
      throw createServiceError(
        ErrorCode.FS_READ_FAILED,
        "Failed to download graph plugin archive",
        { pluginId: item.pluginId, assetUrl: item.assetUrl },
        error,
      );
    });

    if (!response.ok) {
      throw createServiceError(
        ErrorCode.FS_READ_FAILED,
        `Graph plugin download failed with status ${response.status}`,
        { pluginId: item.pluginId, assetUrl: item.assetUrl, status: response.status },
      );
    }

    const raw = Buffer.from(await response.arrayBuffer());
    if (raw.byteLength > MAX_PLUGIN_ARCHIVE_BYTES) {
      throw createServiceError(
        ErrorCode.FS_READ_FAILED,
        "Graph plugin archive is too large",
        { pluginId: item.pluginId, size: raw.byteLength },
      );
    }
    if (item.size !== raw.byteLength) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph plugin archive size mismatch",
        { pluginId: item.pluginId, expected: item.size, actual: raw.byteLength },
      );
    }

    return raw;
  }

  private async extractPluginArchive(buffer: Buffer, destinationRoot: string) {
    await new Promise<void>((resolve, reject) => {
      yauzl.fromBuffer(buffer, { lazyEntries: true }, (openError, zipFile) => {
        if (openError || !zipFile) {
          reject(
            createServiceError(
              ErrorCode.FS_READ_FAILED,
              "Failed to open graph plugin archive",
              undefined,
              openError,
            ),
          );
          return;
        }

        const onFailure = (error: unknown) => {
          zipFile.close();
          reject(error);
        };

        zipFile.on("entry", (entry) => {
          const normalized = normalizeZipPath(entry.fileName);
          if (
            !normalized ||
            !isSafeZipPath(normalized) ||
            isHiddenPath(normalized) ||
            path.isAbsolute(normalized)
          ) {
            onFailure(
              createServiceError(
                ErrorCode.VALIDATION_FAILED,
                "Unsafe graph plugin archive entry",
                { entry: entry.fileName },
              ),
            );
            return;
          }

          if (isSymlinkEntry(entry)) {
            onFailure(
              createServiceError(
                ErrorCode.VALIDATION_FAILED,
                "Graph plugin archive contains a symlink",
                { entry: entry.fileName },
              ),
            );
            return;
          }

          if (isExecutableEntry(entry)) {
            onFailure(
              createServiceError(
                ErrorCode.VALIDATION_FAILED,
                "Executable files are not allowed in V1 graph plugins",
                { entry: entry.fileName },
              ),
            );
            return;
          }

          const targetPath = path.resolve(destinationRoot, normalized);
          if (!isPathInsideRoot(targetPath, destinationRoot)) {
            onFailure(
              createServiceError(
                ErrorCode.VALIDATION_FAILED,
                "Graph plugin archive tried to escape extraction root",
                { entry: entry.fileName },
              ),
            );
            return;
          }

          if (entry.fileName.endsWith("/")) {
            fsp.mkdir(targetPath, { recursive: true })
              .then(() => zipFile.readEntry())
              .catch(onFailure);
            return;
          }

          zipFile.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) {
              onFailure(
                createServiceError(
                  ErrorCode.FS_READ_FAILED,
                  "Failed to read graph plugin archive entry",
                  { entry: entry.fileName },
                  streamError,
                ),
              );
              return;
            }

            const chunks: Buffer[] = [];
            let total = 0;
            stream.on("data", (chunk: Buffer) => {
              total += chunk.length;
              if (total > MAX_PLUGIN_ARCHIVE_BYTES) {
                stream.destroy(
                  createServiceError(
                    ErrorCode.FS_READ_FAILED,
                    "Graph plugin archive entry is too large",
                    { entry: entry.fileName },
                  ),
                );
                return;
              }
              chunks.push(chunk);
            });
            stream.on("error", onFailure);
            stream.on("end", () => {
              fsp.mkdir(path.dirname(targetPath), { recursive: true })
                .then(() => fsp.writeFile(targetPath, Buffer.concat(chunks)))
                .then(() => zipFile.readEntry())
                .catch(onFailure);
            });
          });
        });

        zipFile.on("end", resolve);
        zipFile.on("error", onFailure);
        zipFile.readEntry();
      });
    });
  }

  private async resolveExtractedPackageRoot(extractRoot: string) {
    const directManifestPath = path.join(extractRoot, "plugin.json");
    try {
      await fsp.access(directManifestPath);
      return extractRoot;
    } catch {
      const children = await fsp.readdir(extractRoot, { withFileTypes: true });
      const candidate = await Promise.all(
        children
          .filter((entry) => entry.isDirectory())
          .map(async (entry) => {
            const packageRoot = path.join(extractRoot, entry.name);
            try {
              await fsp.access(path.join(packageRoot, "plugin.json"));
              return packageRoot;
            } catch {
              return null;
            }
          }),
      ).then((items) => items.find(Boolean) ?? null);
      if (!candidate) {
        throw createServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Graph plugin archive does not contain a package root",
        );
      }
      return candidate;
    }
  }

  private async readPluginManifest(packageRoot: string): Promise<GraphPluginManifest> {
    const raw = await this.readJsonFile(path.join(packageRoot, "plugin.json"));
    const parsed = graphPluginManifestSchema.safeParse(raw);
    if (!parsed.success) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid graph plugin manifest",
        { packageRoot, issues: parsed.error.issues },
        parsed.error,
      );
    }
    return parsed.data;
  }

  private async validateTemplateDocuments(
    packageRoot: string,
    manifest: GraphPluginManifest,
  ): Promise<void> {
    const graphPayloads = await Promise.all(
      manifest.templates.map((template) =>
        this.readGraphDocument(packageRoot, template.graphEntry),
      ),
    );
    graphPayloads.forEach((graphPayload) => {
      this.validateWorldEntityGraph(graphPayload);
    });
  }

  private async readInstalledManifest(pluginId: string, version: string) {
    return await this.readPluginManifest(
      this.getInstalledVersionDir(pluginId, version),
    );
  }

  private async readGraphDocument(
    packageRoot: string,
    entryPath: string,
  ): Promise<GraphDocumentPayload> {
    const normalized = normalizeZipPath(entryPath);
    if (!normalized || !isSafeZipPath(normalized) || isHiddenPath(normalized)) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Invalid graph template entry path",
        { entryPath },
      );
    }

    const fullPath = path.resolve(packageRoot, normalized);
    if (!isPathInsideRoot(fullPath, packageRoot)) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph template entry escaped package root",
        { entryPath },
      );
    }

    const raw = await fsp.readFile(fullPath, "utf-8");
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph template JSON is invalid",
        { entryPath },
        error,
      );
    }

    const parsed = LuieWorldGraphSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph template payload is invalid",
        { entryPath, issues: parsed.error.issues },
        parsed.error,
      );
    }
    return parsed.data;
  }

  private validateWorldEntityGraph(graphPayload: GraphDocumentPayload) {
    const nodeIds = new Set<string>();
    const nodes = graphPayload.nodes ?? [];
    const edges = graphPayload.edges ?? [];

    for (const node of nodes) {
      if (!worldEntityIdSchema.safeParse(node.id).success) {
        throw createServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Graph template node id must be a UUID",
          { nodeId: node.id },
        );
      }

      const entityType = this.resolvePluginNodeEntityType(
        node.entityType as WorldEntitySourceType,
        node.subType,
      );
      if (!entityType) {
        throw createServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Graph template nodes must use custom world entity types in V1",
          { nodeId: node.id, entityType: node.entityType, subType: node.subType },
        );
      }

      nodeIds.add(node.id);
    }

    for (const edge of edges) {
      if (!entityRelationIdSchema.safeParse(edge.id).success) {
        throw createServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Graph template edge id must be a UUID",
          { edgeId: edge.id },
        );
      }

      if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId)) {
        throw createServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Graph template edge references missing nodes",
          { edgeId: edge.id, sourceId: edge.sourceId, targetId: edge.targetId },
        );
      }

      const sourceType = this.resolvePluginRelationType(edge.sourceType as WorldEntitySourceType);
      const targetType = this.resolvePluginRelationType(edge.targetType as WorldEntitySourceType);
      if (!sourceType || !targetType) {
        throw createServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Graph template edges must target custom world entity types in V1",
          {
            edgeId: edge.id,
            sourceType: edge.sourceType,
            targetType: edge.targetType,
          },
        );
      }

      if (!isRelationAllowed(edge.relation as never, sourceType, targetType)) {
        throw createServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Graph template contains an invalid relation mapping",
          {
            edgeId: edge.id,
            relation: edge.relation,
            sourceType,
            targetType,
          },
        );
      }
    }
  }

  private resolvePluginNodeEntityType(
    entityType: WorldEntitySourceType,
    subType?: string,
  ) {
    const candidate =
      entityType === "WorldEntity" ? subType : entityType;
    const parsed = worldEntityTypeSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  }

  private resolvePluginRelationType(entityType: WorldEntitySourceType) {
    return this.resolvePluginNodeEntityType(entityType, entityType);
  }

  private async replaceProjectWorldEntityGraph(
    projectId: string,
    graphPayload: GraphDocumentPayload,
  ) {
    this.validateWorldEntityGraph(graphPayload);
    const client = db.getClient();
    const nodes = graphPayload.nodes ?? [];
    const edges = graphPayload.edges ?? [];
    const now = this.now();

    await client.$transaction(async (tx) => {
      await tx.entityRelation.deleteMany({
        where: {
          projectId,
          OR: [
            { sourceWorldEntityId: { not: null } },
            { targetWorldEntityId: { not: null } },
          ],
        },
      });
      await tx.worldEntity.deleteMany({
        where: { projectId },
      });

      if (nodes.length > 0) {
        await tx.worldEntity.createMany({
          data: nodes.map((node) => ({
            id: node.id,
            projectId,
            type: this.resolvePluginNodeEntityType(
              node.entityType as WorldEntitySourceType,
              node.subType,
            )!,
            name: node.name,
            description: node.description ?? null,
            firstAppearance: node.firstAppearance ?? null,
            attributes: node.attributes ? JSON.stringify(node.attributes) : null,
            positionX: node.positionX ?? 0,
            positionY: node.positionY ?? 0,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }

      if (edges.length > 0) {
        await tx.entityRelation.createMany({
          data: edges.map((edge) => ({
            id: edge.id,
            projectId,
            sourceId: edge.sourceId,
            sourceType: this.resolvePluginRelationType(
              edge.sourceType as WorldEntitySourceType,
            )!,
            targetId: edge.targetId,
            targetType: this.resolvePluginRelationType(
              edge.targetType as WorldEntitySourceType,
            )!,
            relation: edge.relation,
            attributes:
              edge.attributes && typeof edge.attributes === "object"
                ? JSON.stringify(edge.attributes)
                : null,
            sourceWorldEntityId: edge.sourceId,
            targetWorldEntityId: edge.targetId,
            createdAt:
              edge.createdAt && !Number.isNaN(new Date(edge.createdAt).getTime())
                ? new Date(edge.createdAt)
                : now,
            updatedAt:
              edge.updatedAt && !Number.isNaN(new Date(edge.updatedAt).getTime())
                ? new Date(edge.updatedAt)
                : now,
          })),
        });
      }
    });

  }

  private assertCatalogCompatibility(item: LocalCatalogItem) {
    if (compareVersionPart(APP_VERSION, item.minAppVersion) < 0) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "App version is below graph plugin minimum version",
        {
          appVersion: APP_VERSION,
          minAppVersion: item.minAppVersion,
          pluginId: item.pluginId,
        },
      );
    }

    if (!hasMatchingApiMajor(item.apiVersion, "1.0.0")) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph plugin apiVersion is not supported",
        { pluginId: item.pluginId, apiVersion: item.apiVersion },
      );
    }
  }

  private assertManifestMatchesCatalog(
    item: LocalCatalogItem,
    manifest: GraphPluginManifest,
  ) {
    if (manifest.id !== item.pluginId || manifest.version !== item.version) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph plugin manifest does not match catalog entry",
        {
          pluginId: item.pluginId,
          manifestId: manifest.id,
          catalogVersion: item.version,
          manifestVersion: manifest.version,
        },
      );
    }

    if (!hasMatchingApiMajor(manifest.apiVersion, item.apiVersion)) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph plugin manifest apiVersion does not match catalog",
        {
          pluginId: item.pluginId,
          manifestApiVersion: manifest.apiVersion,
          catalogApiVersion: item.apiVersion,
        },
      );
    }
  }

  private async removeLegacyVersions(pluginId: string, keepVersion: string) {
    const pluginDir = this.getInstalledPluginDir(pluginId);
    let entries: Dirent<string>[];
    try {
      entries = await fsp.readdir(pluginDir, {
        withFileTypes: true,
        encoding: "utf8",
      });
    } catch {
      return;
    }

    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && entry.name !== keepVersion)
        .map((entry) =>
          fsp.rm(path.join(pluginDir, entry.name), {
            recursive: true,
            force: true,
          }),
        ),
    );
  }

  private async readJsonFile<T>(filePath: string, fallback?: T): Promise<T> {
    try {
      const raw = await fsp.readFile(filePath, "utf-8");
      return JSON.parse(raw) as T;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code === "ENOENT" && fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  private isPackaged() {
    return process.env.NODE_ENV === "production";
  }
}

export const graphPluginService = new GraphPluginService();
