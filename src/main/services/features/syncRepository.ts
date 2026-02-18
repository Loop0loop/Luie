import { createLogger } from "../../../shared/logger/index.js";
import type {
  SyncBundle,
  SyncChapterRecord,
  SyncCharacterRecord,
  SyncMemoRecord,
  SyncProjectRecord,
  SyncSnapshotRecord,
  SyncTermRecord,
  SyncTombstoneRecord,
  SyncWorldDocumentRecord,
} from "./syncMapper.js";
import { createEmptySyncBundle } from "./syncMapper.js";

const logger = createLogger("SyncRepository");

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

type DbRow = Record<string, unknown>;

const toNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toStringOrFallback = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const toIsoString = (value: unknown, fallback = new Date().toISOString()): string => {
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
};

const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const parseJsonString = (value: string): unknown => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

const normalizeJsonValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return parseJsonString(value);
  }
  return value ?? null;
};

const normalizeToRow = (value: Record<string, unknown>): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  for (const [key, current] of Object.entries(value)) {
    if (current !== undefined) {
      next[key] = current;
    }
  }
  return next;
};

const encodeStoragePath = (path: string): string =>
  path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const getSupabaseConfig = (): SupabaseConfig | null => {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  return {
    url: url.endsWith("/") ? url.slice(0, -1) : url,
    anonKey,
  };
};

const mapProjectRow = (row: DbRow): SyncProjectRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  if (!id || !userId) return null;

  return {
    id,
    userId,
    title: toStringOrFallback(row.title, "Untitled"),
    description: toNullableString(row.description),
    projectPath: toNullableString(row.project_path),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapChapterRow = (row: DbRow): SyncChapterRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  return {
    id,
    userId,
    projectId,
    title: toStringOrFallback(row.title, "Untitled"),
    content: toNullableString(row.content) ?? "",
    synopsis: toNullableString(row.synopsis),
    order: toNumber(row.order),
    wordCount: toNumber(row.word_count),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapCharacterRow = (row: DbRow): SyncCharacterRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  return {
    id,
    userId,
    projectId,
    name: toStringOrFallback(row.name, "Character"),
    description: toNullableString(row.description),
    firstAppearance: toNullableString(row.first_appearance),
    attributes: normalizeJsonValue(row.attributes),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapTermRow = (row: DbRow): SyncTermRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  return {
    id,
    userId,
    projectId,
    term: toStringOrFallback(row.term, "Term"),
    definition: toNullableString(row.definition),
    category: toNullableString(row.category),
    order: toNumber(row.order),
    firstAppearance: toNullableString(row.first_appearance),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapWorldDocumentRow = (row: DbRow): SyncWorldDocumentRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  const docType = toNullableString(row.doc_type);
  if (!id || !userId || !projectId || !docType) return null;

  if (
    docType !== "synopsis" &&
    docType !== "plot" &&
    docType !== "drawing" &&
    docType !== "mindmap" &&
    docType !== "scrap"
  ) {
    return null;
  }

  return {
    id,
    userId,
    projectId,
    docType,
    payload: row.payload ?? {},
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapMemoRow = (row: DbRow): SyncMemoRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  return {
    id,
    userId,
    projectId,
    title: toStringOrFallback(row.title, "Memo"),
    content: toNullableString(row.content) ?? "",
    tags: toStringArray(row.tags),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
  };
};

const mapSnapshotRow = (row: DbRow): SyncSnapshotRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  if (!id || !userId || !projectId) return null;

  const contentInline = toNullableString(row.content_inline);

  return {
    id,
    userId,
    projectId,
    chapterId: toNullableString(row.chapter_id),
    description: toNullableString(row.description),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    deletedAt: toNullableString(row.deleted_at),
    contentLength: toNumber(row.content_length, contentInline?.length ?? 0),
    contentPath: toNullableString(row.content_path),
    contentInline,
  };
};

const mapTombstoneRow = (row: DbRow): SyncTombstoneRecord | null => {
  const id = toNullableString(row.id);
  const userId = toNullableString(row.user_id);
  const projectId = toNullableString(row.project_id);
  const entityType = toNullableString(row.entity_type);
  const entityId = toNullableString(row.entity_id);
  if (!id || !userId || !projectId || !entityType || !entityId) return null;

  return {
    id,
    userId,
    projectId,
    entityType,
    entityId,
    deletedAt: toIsoString(row.deleted_at),
    updatedAt: toIsoString(row.updated_at),
  };
};

class SyncRepository {
  isConfigured(): boolean {
    return getSupabaseConfig() !== null;
  }

  async fetchBundle(accessToken: string, userId: string): Promise<SyncBundle> {
    const bundle = createEmptySyncBundle();

    const [
      projectsRaw,
      chaptersRaw,
      charactersRaw,
      termsRaw,
      worldDocsRaw,
      memosRaw,
      snapshotsRaw,
      tombstonesRaw,
    ] = await Promise.all([
      this.fetchTableRaw("projects", accessToken, userId),
      this.fetchTableRaw("chapters", accessToken, userId),
      this.fetchTableRaw("characters", accessToken, userId),
      this.fetchTableRaw("terms", accessToken, userId),
      this.fetchTableRaw("world_documents", accessToken, userId),
      this.fetchTableRaw("memos", accessToken, userId),
      this.fetchTableRaw("snapshots", accessToken, userId),
      this.fetchTableRaw("tombstones", accessToken, userId),
    ]);

    bundle.projects = projectsRaw.map(mapProjectRow).filter((row): row is SyncProjectRecord => row !== null);
    bundle.chapters = chaptersRaw.map(mapChapterRow).filter((row): row is SyncChapterRecord => row !== null);
    bundle.characters = charactersRaw.map(mapCharacterRow).filter((row): row is SyncCharacterRecord => row !== null);
    bundle.terms = termsRaw.map(mapTermRow).filter((row): row is SyncTermRecord => row !== null);
    bundle.worldDocuments = worldDocsRaw
      .map(mapWorldDocumentRow)
      .filter((row): row is SyncWorldDocumentRecord => row !== null);
    bundle.memos = memosRaw.map(mapMemoRow).filter((row): row is SyncMemoRecord => row !== null);
    bundle.tombstones = tombstonesRaw
      .map(mapTombstoneRow)
      .filter((row): row is SyncTombstoneRecord => row !== null);

    const mappedSnapshots = snapshotsRaw
      .map(mapSnapshotRow)
      .filter((row): row is SyncSnapshotRecord => row !== null);
    bundle.snapshots = await this.hydrateSnapshotContents(accessToken, mappedSnapshots);

    return bundle;
  }

  async upsertBundle(accessToken: string, bundle: SyncBundle): Promise<void> {
    const projectRows = bundle.projects.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        title: record.title,
        description: record.description ?? null,
        project_path: record.projectPath ?? null,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        deleted_at: record.deletedAt ?? null,
      }),
    );

    const chapterRows = bundle.chapters.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        project_id: record.projectId,
        title: record.title,
        content: record.content,
        synopsis: record.synopsis ?? null,
        order: record.order,
        word_count: record.wordCount,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        deleted_at: record.deletedAt ?? null,
      }),
    );

    const characterRows = bundle.characters.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        project_id: record.projectId,
        name: record.name,
        description: record.description ?? null,
        first_appearance: record.firstAppearance ?? null,
        attributes: normalizeJsonValue(record.attributes),
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        deleted_at: record.deletedAt ?? null,
      }),
    );

    const termRows = bundle.terms.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        project_id: record.projectId,
        term: record.term,
        definition: record.definition ?? null,
        category: record.category ?? null,
        order: record.order,
        first_appearance: record.firstAppearance ?? null,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        deleted_at: record.deletedAt ?? null,
      }),
    );

    const worldDocumentRows = bundle.worldDocuments.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        project_id: record.projectId,
        doc_type: record.docType,
        payload: record.payload ?? {},
        updated_at: record.updatedAt,
        deleted_at: record.deletedAt ?? null,
      }),
    );

    const memoRows = bundle.memos.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        project_id: record.projectId,
        title: record.title,
        content: record.content,
        tags: record.tags,
        updated_at: record.updatedAt,
        deleted_at: record.deletedAt ?? null,
      }),
    );

    const snapshotRows = await this.uploadSnapshots(accessToken, bundle.snapshots);
    const snapshotPayloadRows = snapshotRows.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        project_id: record.projectId,
        chapter_id: record.chapterId ?? null,
        content_length: record.contentLength,
        content_path: record.contentPath ?? null,
        content_inline: record.contentInline ?? null,
        description: record.description ?? null,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        deleted_at: record.deletedAt ?? null,
      }),
    );

    const tombstoneRows = bundle.tombstones.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        project_id: record.projectId,
        entity_type: record.entityType,
        entity_id: record.entityId,
        deleted_at: record.deletedAt,
        updated_at: record.updatedAt,
      }),
    );

    await this.upsertTable("projects", accessToken, projectRows, "id,user_id");
    await this.upsertTable("chapters", accessToken, chapterRows, "id,user_id");
    await this.upsertTable("characters", accessToken, characterRows, "id,user_id");
    await this.upsertTable("terms", accessToken, termRows, "id,user_id");
    await this.upsertTable("world_documents", accessToken, worldDocumentRows, "id,user_id");
    await this.upsertTable("memos", accessToken, memoRows, "id,user_id");
    await this.upsertTable("snapshots", accessToken, snapshotPayloadRows, "id,user_id");
    await this.upsertTable("tombstones", accessToken, tombstoneRows, "id,user_id");
  }

  private async fetchTableRaw(
    table: string,
    accessToken: string,
    userId: string,
  ): Promise<DbRow[]> {
    const config = getSupabaseConfig();
    if (!config) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }

    const query = new URLSearchParams();
    query.set("select", "*");
    query.set("user_id", `eq.${userId}`);

    const response = await fetch(`${config.url}/rest/v1/${table}?${query.toString()}`, {
      method: "GET",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      logger.warn("Failed to fetch sync table", {
        table,
        status: response.status,
        body,
      });
      return [];
    }

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as DbRow[]) : [];
  }

  private async upsertTable(
    table: string,
    accessToken: string,
    rows: Array<Record<string, unknown>>,
    onConflict: string,
  ): Promise<void> {
    if (rows.length === 0) return;

    const config = getSupabaseConfig();
    if (!config) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }

    const response = await fetch(
      `${config.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
      {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(rows),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SUPABASE_UPSERT_FAILED:${table}:${response.status}:${body}`);
    }
  }

  private async hydrateSnapshotContents(
    accessToken: string,
    snapshots: SyncSnapshotRecord[],
  ): Promise<SyncSnapshotRecord[]> {
    const hydrated: SyncSnapshotRecord[] = [];

    for (const snapshot of snapshots) {
      if (snapshot.contentInline && snapshot.contentInline.length > 0) {
        hydrated.push(snapshot);
        continue;
      }

      if (!snapshot.contentPath) {
        hydrated.push(snapshot);
        continue;
      }

      const content = await this.downloadSnapshotContent(accessToken, snapshot.contentPath);
      if (content === null) {
        hydrated.push(snapshot);
        continue;
      }

      hydrated.push({
        ...snapshot,
        contentInline: content,
        contentLength: snapshot.contentLength || content.length,
      });
    }

    return hydrated;
  }

  private async downloadSnapshotContent(
    accessToken: string,
    contentPath: string,
  ): Promise<string | null> {
    const config = getSupabaseConfig();
    if (!config) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }

    const encodedPath = encodeStoragePath(contentPath);
    const response = await fetch(
      `${config.url}/storage/v1/object/luie-snapshots/${encodedPath}`,
      {
        method: "GET",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      logger.warn("Snapshot blob download failed", {
        contentPath,
        status: response.status,
        body,
      });
      return null;
    }

    return response.text();
  }

  private async uploadSnapshots(
    accessToken: string,
    snapshots: SyncSnapshotRecord[],
  ): Promise<SyncSnapshotRecord[]> {
    const config = getSupabaseConfig();
    if (!config) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }

    const nextSnapshots: SyncSnapshotRecord[] = [];
    for (const snapshot of snapshots) {
      if (!snapshot.contentInline || snapshot.contentInline.length === 0) {
        nextSnapshots.push(snapshot);
        continue;
      }

      const objectPath = `${snapshot.userId}/${snapshot.projectId}/${snapshot.id}.snap`;
      const encodedPath = encodeStoragePath(objectPath);

      const response = await fetch(
        `${config.url}/storage/v1/object/luie-snapshots/${encodedPath}`,
        {
          method: "POST",
          headers: {
            apikey: config.anonKey,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "text/plain; charset=utf-8",
            "x-upsert": "true",
          },
          body: snapshot.contentInline,
        },
      );

      if (!response.ok) {
        const body = await response.text();
        logger.warn("Snapshot blob upload failed, keeping inline payload", {
          snapshotId: snapshot.id,
          status: response.status,
          body,
        });
        nextSnapshots.push(snapshot);
        continue;
      }

      nextSnapshots.push({
        ...snapshot,
        contentPath: objectPath,
        contentInline: undefined,
      });
    }

    return nextSnapshots;
  }
}

export const syncRepository = new SyncRepository();
