import { and, eq, isNull } from "drizzle-orm";
import {
  CANVAS_AUX_NODE_SUBTYPES,
  MEMORY_DOMAIN_SOURCE_TYPES,
} from "../../../shared/constants/memoryDomain.js";
import type {
  EntityRelation,
  RelationKind,
  WorldEntitySourceType,
  WorldEntityType,
  WorldGraphData,
  WorldGraphNode,
} from "../../../shared/types/index.js";
import type { MainDrizzleClient } from "../../infra/database/index.js";
import {
  character,
  entityRelation,
  event,
  faction,
  note,
  plot,
  scene,
  scrapMemo,
  synopsis,
  term,
  worldEntity,
} from "../../infra/database/index.js";
import { buildCanonicalWorldEntityPointers } from "./entityRelationPointers.js";
import { parseAttributes } from "./entityRelationMapper.js";

const parseTags = (raw: string | null | undefined): string[] => {
  try {
    return JSON.parse(raw ?? "[]") as string[];
  } catch {
    return [];
  }
};

export async function buildWorldGraph(
  client: MainDrizzleClient,
  projectId: string,
): Promise<WorldGraphData> {
  const [
    characters,
    factions,
    events,
    terms,
    worldEntities,
    scenes,
    notes,
    synopses,
    plots,
    scraps,
    edges,
  ] = await Promise.all([
    client
      .select()
      .from(character)
      .where(
        and(eq(character.projectId, projectId), isNull(character.deletedAt)),
      ),
    client
      .select()
      .from(faction)
      .where(and(eq(faction.projectId, projectId), isNull(faction.deletedAt))),
    client
      .select()
      .from(event)
      .where(and(eq(event.projectId, projectId), isNull(event.deletedAt))),
    client
      .select()
      .from(term)
      .where(and(eq(term.projectId, projectId), isNull(term.deletedAt))),
    client
      .select()
      .from(worldEntity)
      .where(
        and(
          eq(worldEntity.projectId, projectId),
          isNull(worldEntity.deletedAt),
        ),
      ),
    client
      .select()
      .from(scene)
      .where(and(eq(scene.projectId, projectId), isNull(scene.deletedAt))),
    client
      .select()
      .from(note)
      .where(and(eq(note.projectId, projectId), isNull(note.deletedAt))),
    client
      .select()
      .from(synopsis)
      .where(
        and(eq(synopsis.projectId, projectId), isNull(synopsis.deletedAt)),
      ),
    client
      .select()
      .from(plot)
      .where(and(eq(plot.projectId, projectId), isNull(plot.deletedAt))),
    client
      .select()
      .from(scrapMemo)
      .where(
        and(eq(scrapMemo.projectId, projectId), isNull(scrapMemo.deletedAt)),
      ),
    client
      .select()
      .from(entityRelation)
      .where(eq(entityRelation.projectId, projectId)),
  ]);

  const nodes: WorldGraphNode[] = [
    ...characters.map(
      (item): WorldGraphNode => ({
        id: item.id,
        entityType: "Character",
        name: item.name,
        description: item.description,
        firstAppearance: item.firstAppearance,
        attributes: parseAttributes(item.attributes),
        positionX: 0,
        positionY: 0,
      }),
    ),
    ...factions.map(
      (item): WorldGraphNode => ({
        id: item.id,
        entityType: "Faction",
        name: item.name,
        description: item.description,
        firstAppearance: item.firstAppearance,
        attributes: parseAttributes(item.attributes),
        positionX: 0,
        positionY: 0,
      }),
    ),
    ...events.map(
      (item): WorldGraphNode => ({
        id: item.id,
        entityType: "Event",
        name: item.name,
        description: item.description,
        firstAppearance: item.firstAppearance,
        attributes: parseAttributes(item.attributes),
        positionX: 0,
        positionY: 0,
      }),
    ),
    ...terms.map(
      (item): WorldGraphNode => ({
        id: item.id,
        entityType: "Term",
        name: item.term,
        description: item.definition ?? null,
        firstAppearance: item.firstAppearance,
        attributes: item.category ? { tags: [item.category] } : null,
        positionX: 0,
        positionY: 0,
      }),
    ),
    ...worldEntities.map(
      (item): WorldGraphNode => ({
        id: item.id,
        entityType: (item.type ?? "Place") as WorldEntitySourceType,
        subType: (item.type ?? "Place") as WorldEntityType,
        name: item.name,
        description: item.description,
        firstAppearance: item.firstAppearance,
        attributes: parseAttributes(item.attributes),
        positionX: item.positionX ?? 0,
        positionY: item.positionY ?? 0,
      }),
    ),
    ...scenes.map(
      (item): WorldGraphNode => ({
        id: item.id,
        entityType: "WorldEntity",
        subType: CANVAS_AUX_NODE_SUBTYPES.SCENE,
        name: `Scene · ${item.title}`,
        description: item.body?.slice(0, 240) ?? null,
        firstAppearance: null,
        attributes: {
          sourceType: MEMORY_DOMAIN_SOURCE_TYPES.SCENE,
          sourceId: item.id,
          chapterId: item.chapterId,
        },
        positionX: 0,
        positionY: 0,
      }),
    ),
    ...notes.map(
      (item): WorldGraphNode => ({
        id: item.id,
        entityType: "WorldEntity",
        subType: CANVAS_AUX_NODE_SUBTYPES.NOTE,
        name: `Note · ${item.title}`,
        description: item.body?.slice(0, 240) ?? null,
        firstAppearance: null,
        attributes: {
          sourceType: MEMORY_DOMAIN_SOURCE_TYPES.NOTE,
          sourceId: item.id,
          chapterId: item.chapterId ?? null,
        },
        positionX: 0,
        positionY: 0,
      }),
    ),
    ...synopses.map(
      (item): WorldGraphNode => ({
        id: item.id,
        entityType: "WorldEntity",
        subType: CANVAS_AUX_NODE_SUBTYPES.SYNOPSIS,
        name: `Synopsis · ${item.title}`,
        description: item.body?.slice(0, 240) ?? null,
        firstAppearance: null,
        attributes: {
          sourceType: MEMORY_DOMAIN_SOURCE_TYPES.SYNOPSIS,
          sourceId: item.id,
          chapterId: item.chapterId ?? null,
        },
        positionX: 0,
        positionY: 0,
      }),
    ),
    ...plots.map(
      (item): WorldGraphNode => ({
        id: item.id,
        entityType: "WorldEntity",
        subType: CANVAS_AUX_NODE_SUBTYPES.PLOT,
        name: `Plot · ${item.title}`,
        description: item.body?.slice(0, 240) ?? null,
        firstAppearance: null,
        attributes: {
          sourceType: MEMORY_DOMAIN_SOURCE_TYPES.PLOT,
          sourceId: item.id,
        },
        positionX: 0,
        positionY: 0,
      }),
    ),
    ...scraps.map(
      (item): WorldGraphNode => ({
        id: item.id,
        entityType: "WorldEntity",
        subType: CANVAS_AUX_NODE_SUBTYPES.SCRAP,
        name: `Scrap · ${item.title}`,
        description: item.content?.slice(0, 240) ?? null,
        firstAppearance: null,
        attributes: {
          sourceType: MEMORY_DOMAIN_SOURCE_TYPES.SCRAP_MEMO,
          sourceId: item.id,
          tags: parseTags(item.tags),
        },
        positionX: 0,
        positionY: 0,
      }),
    ),
  ];

  const typedEdges: EntityRelation[] = edges.map(
    (item): EntityRelation => ({
      ...buildCanonicalWorldEntityPointers({
        sourceId: item.sourceId ?? "",
        sourceType: (item.sourceType ?? "Character") as WorldEntitySourceType,
        targetId: item.targetId ?? "",
        targetType: (item.targetType ?? "Character") as WorldEntitySourceType,
      }),
      id: item.id,
      projectId: item.projectId ?? projectId,
      sourceId: item.sourceId ?? "",
      sourceType: (item.sourceType ?? "Character") as WorldEntitySourceType,
      targetId: item.targetId ?? "",
      targetType: (item.targetType ?? "Character") as WorldEntitySourceType,
      relation: (item.relation ?? "belongs_to") as RelationKind,
      attributes: item.attributes
        ? (parseAttributes(item.attributes) as Record<string, unknown>)
        : null,
      createdAt: (item.createdAt as string | Date) ?? new Date(),
      updatedAt: (item.updatedAt as string | Date) ?? new Date(),
    }),
  );

  const nodeIds = new Set(nodes.map((node) => node.id));
  const filteredEdges = typedEdges.filter(
    (edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId),
  );

  return { nodes, edges: filteredEdges };
}
