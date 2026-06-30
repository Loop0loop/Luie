import type {
  EntityRelation,
  RelationKind,
  WorldEntityAttributes,
  WorldEntitySourceType,
} from "../../../../../shared/types/index.js";
import { buildCanonicalWorldEntityPointers } from "./entityRelationPointers.js";

export type EntityRelationRawRow = {
  id: string;
  name?: string;
  term?: string;
  definition?: string | null;
  category?: string | null;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: string | null;
  type?: string;
  positionX?: number;
  positionY?: number;
  projectId?: string;
  sourceId?: string;
  sourceType?: string;
  targetId?: string;
  targetType?: string;
  relation?: string;
  sourceWorldEntityId?: string | null;
  targetWorldEntityId?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
};

export function parseAttributes(
  raw: string | null | undefined,
): WorldEntityAttributes | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WorldEntityAttributes;
  } catch {
    return null;
  }
}

export function toEntityRelation(row: EntityRelationRawRow): EntityRelation {
  const sourceType = (row.sourceType ?? "Character") as WorldEntitySourceType;
  const targetType = (row.targetType ?? "Character") as WorldEntitySourceType;
  const sourceId = String(row.sourceId ?? "");
  const targetId = String(row.targetId ?? "");
  const pointers = buildCanonicalWorldEntityPointers({
    sourceId,
    sourceType,
    targetId,
    targetType,
  });

  return {
    id: row.id,
    projectId: String(row.projectId ?? ""),
    sourceId,
    sourceType,
    targetId,
    targetType,
    relation: (row.relation ?? "belongs_to") as RelationKind,
    attributes: parseAttributes(row.attributes),
    sourceWorldEntityId: pointers.sourceWorldEntityId,
    targetWorldEntityId: pointers.targetWorldEntityId,
    createdAt: (row.createdAt as string | Date) ?? new Date(),
    updatedAt: (row.updatedAt as string | Date) ?? new Date(),
  };
}
