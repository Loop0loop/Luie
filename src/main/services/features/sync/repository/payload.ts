import type { SyncBundle } from "../syncMapper.js";
import {
  normalizeJsonValue,
  normalizeToRow,
} from "./rowUtils.js";

export type RemoteUpsertRows = {
  projects: Array<Record<string, unknown>>;
  chapters: Array<Record<string, unknown>>;
  characters: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  factions: Array<Record<string, unknown>>;
  terms: Array<Record<string, unknown>>;
  worldDocuments: Array<Record<string, unknown>>;
  memos: Array<Record<string, unknown>>;
  tombstones: Array<Record<string, unknown>>;
};

export function buildRemoteUpsertRows(bundle: SyncBundle): RemoteUpsertRows {
  return {
    projects: bundle.projects.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        title: record.title,
        description: record.description ?? null,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        deleted_at: record.deletedAt ?? null,
      }),
    ),
    chapters: bundle.chapters.map((record) =>
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
    ),
    characters: bundle.characters.map((record) =>
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
    ),
    events: bundle.events.map((record) =>
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
    ),
    factions: bundle.factions.map((record) =>
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
    ),
    terms: bundle.terms.map((record) =>
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
    ),
    worldDocuments: bundle.worldDocuments.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        project_id: record.projectId,
        doc_type: record.docType,
        payload: record.payload ?? {},
        updated_at: record.updatedAt,
        deleted_at: record.deletedAt ?? null,
      }),
    ),
    memos: bundle.memos.map((record) =>
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
    ),
    tombstones: bundle.tombstones.map((record) =>
      normalizeToRow({
        id: record.id,
        user_id: record.userId,
        project_id: record.projectId,
        entity_type: record.entityType,
        entity_id: record.entityId,
        deleted_at: record.deletedAt,
        updated_at: record.updatedAt,
      }),
    ),
  };
}
