import { createEmptySyncBundle, type SyncBundle } from "../syncMapper.js";
import { getSupabaseConfig } from "../supabaseEnv.js";
import {
  fetchOptionalTableRaw,
  fetchTableRaw,
  upsertOptionalTable,
  upsertTable,
} from "./http.js";
import { mapRemoteRowsToBundle } from "./mappers.js";
import { buildRemoteUpsertRows } from "./payload.js";

class SyncRepository {
  isConfigured(): boolean {
    return getSupabaseConfig() !== null;
  }

  async fetchBundle(accessToken: string, userId: string): Promise<SyncBundle> {
    const bundle = createEmptySyncBundle();

    const [
      projects,
      chapters,
      characters,
      events,
      factions,
      terms,
      worldDocuments,
      memos,
      memoryCanonicalRows,
      tombstones,
    ] = await Promise.all([
      fetchTableRaw("projects", accessToken, userId),
      fetchTableRaw("chapters", accessToken, userId),
      fetchTableRaw("characters", accessToken, userId),
      fetchTableRaw("events", accessToken, userId),
      fetchTableRaw("factions", accessToken, userId),
      fetchTableRaw("terms", accessToken, userId),
      fetchTableRaw("world_documents", accessToken, userId),
      fetchTableRaw("memos", accessToken, userId),
      fetchOptionalTableRaw("memory_canonical_rows", accessToken, userId),
      fetchTableRaw("tombstones", accessToken, userId),
    ]);

    return mapRemoteRowsToBundle(bundle, {
      projects,
      chapters,
      characters,
      events,
      factions,
      terms,
      worldDocuments,
      memos,
      memoryCanonicalRows,
      tombstones,
    });
  }

  async upsertBundle(accessToken: string, bundle: SyncBundle): Promise<void> {
    const rows = buildRemoteUpsertRows(bundle);

    await upsertTable("projects", accessToken, rows.projects, "id,user_id");
    await upsertTable("chapters", accessToken, rows.chapters, "id,user_id");
    await upsertTable("characters", accessToken, rows.characters, "id,user_id");
    await upsertTable("events", accessToken, rows.events, "id,user_id");
    await upsertTable("factions", accessToken, rows.factions, "id,user_id");
    await upsertTable("terms", accessToken, rows.terms, "id,user_id");
    await upsertTable(
      "world_documents",
      accessToken,
      rows.worldDocuments,
      "id,user_id",
    );
    await upsertTable("memos", accessToken, rows.memos, "id,user_id");
    await upsertOptionalTable(
      "memory_canonical_rows",
      accessToken,
      rows.memoryCanonicalRows,
      "id,user_id",
    );
    await upsertTable(
      "tombstones",
      accessToken,
      rows.tombstones,
      "id,user_id",
    );
  }
}

export const syncRepository = new SyncRepository();
