/**
 * EntityRelation service — 세계관 6종 관계 CRUD + 그래프 조회
 */

import { eq, asc, inArray, isNull, and } from "drizzle-orm";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import {
    isRelationAllowed,
    isWorldEntityBackedType,
} from "../../../shared/constants/worldRelationRules.js";
import type {
    EntityRelationCreateInput,
    EntityRelationUpdateInput,
    EntityRelation,
    WorldGraphData,
    WorldGraphNode,
    WorldEntitySourceType,
    WorldEntityType,
    WorldEntityAttributes,
    RelationKind,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import { projectService } from "../core/projectService.js";
import { db } from "../../database/index.js";
import {
    entityRelation,
    character,
    faction,
    event,
    term,
    worldEntity,
    project,
    scene,
    note,
    synopsis,
    plot,
    scrapMemo,
} from "../../database/schema.js";

const logger = createLogger("EntityRelationService");

type RawRow = {
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

function parseAttributes(raw: string | null | undefined): WorldEntityAttributes | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as WorldEntityAttributes;
    } catch {
        return null;
    }
}

function toEntityRelation(row: RawRow): EntityRelation {
    return {
        id: row.id,
        projectId: String(row.projectId ?? ""),
        sourceId: String(row.sourceId ?? ""),
        sourceType: (row.sourceType ?? "Character") as WorldEntitySourceType,
        targetId: String(row.targetId ?? ""),
        targetType: (row.targetType ?? "Character") as WorldEntitySourceType,
        relation: (row.relation ?? "belongs_to") as RelationKind,
        attributes: parseAttributes(row.attributes),
        sourceWorldEntityId: (row.sourceWorldEntityId as string | null | undefined) ?? null,
        targetWorldEntityId: (row.targetWorldEntityId as string | null | undefined) ?? null,
        createdAt: (row.createdAt as string | Date) ?? new Date(),
        updatedAt: (row.updatedAt as string | Date) ?? new Date(),
    };
}

export class EntityRelationService {
    private async getClient() {
        await db.initialize();
        return db.getClient();
    }

    async createRelation(input: EntityRelationCreateInput) {
        try {
            logger.info("Creating entity relation", input);

            if (!isRelationAllowed(input.relation, input.sourceType, input.targetType)) {
                throw new ServiceError(
                    ErrorCode.VALIDATION_FAILED,
                    "Invalid relation mapping",
                    { input },
                );
            }

            const insertData: typeof entityRelation.$inferInsert = {
                id: crypto.randomUUID(),
                projectId: input.projectId,
                sourceId: input.sourceId,
                sourceType: input.sourceType,
                targetId: input.targetId,
                targetType: input.targetType,
                relation: input.relation,
                attributes: input.attributes ? JSON.stringify(input.attributes) : null,
                updatedAt: new Date().toISOString(),
            };

            // FK 연결 — WorldEntity-backed 타입인 경우 DB FK 설정
            if (isWorldEntityBackedType(input.sourceType)) insertData.sourceWorldEntityId = input.sourceId;
            if (isWorldEntityBackedType(input.targetType)) insertData.targetWorldEntityId = input.targetId;

            const client = await this.getClient();
            const [result] = await client.insert(entityRelation).values(insertData).returning();

            if (!result) {
                throw new ServiceError(
                    ErrorCode.ENTITY_RELATION_CREATE_FAILED,
                    "Failed to create entity relation",
                    { input },
                );
            }

            logger.info("Entity relation created", { relationId: result.id });
            await projectService.touchProject(input.projectId);
            await projectService.persistPackageAfterMutation(input.projectId, "entity-relation:create");
            return toEntityRelation(result as RawRow);
        } catch (error) {
            logger.error("Failed to create entity relation", error);
            if (error instanceof ServiceError) throw error;
            throw new ServiceError(
                ErrorCode.ENTITY_RELATION_CREATE_FAILED,
                "Failed to create entity relation",
                { input },
                error,
            );
        }
    }

    async getAllRelations(projectId: string) {
        try {
            const client = await this.getClient();
            const relations = await client.select().from(entityRelation).where(eq(entityRelation.projectId, projectId)).orderBy(asc(entityRelation.createdAt));

            return relations.map(toEntityRelation);
        } catch (error) {
            logger.error("Failed to get all entity relations", error);
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to get entity relations",
                { projectId },
                error,
            );
        }
    }

    async updateRelation(input: EntityRelationUpdateInput) {
        try {
            const client = await this.getClient();
            const currentResults = await client.select().from(entityRelation).where(eq(entityRelation.id, input.id)).limit(1);
            const current = currentResults[0];
            if (!current) {
                throw new ServiceError(
                    ErrorCode.ENTITY_RELATION_NOT_FOUND,
                    "Entity relation not found",
                    { id: input.id },
                );
            }

            if (
                input.relation &&
                !isRelationAllowed(
                    input.relation,
                    current.sourceType as WorldEntitySourceType,
                    current.targetType as WorldEntitySourceType,
                )
            ) {
                throw new ServiceError(
                    ErrorCode.VALIDATION_FAILED,
                    "Invalid relation mapping",
                    {
                        id: input.id,
                        sourceType: current.sourceType,
                        targetType: current.targetType,
                        relation: input.relation,
                    },
                );
            }

            const updateData: Record<string, unknown> = {};

            if (input.relation !== undefined) updateData.relation = input.relation;
            if (input.attributes !== undefined) {
                updateData.attributes = JSON.stringify(input.attributes);
            }

            const [updated] = await client.update(entityRelation).set(updateData).where(eq(entityRelation.id, input.id)).returning();

            if (!updated) {
                throw new ServiceError(
                    ErrorCode.ENTITY_RELATION_NOT_FOUND,
                    "Entity relation not found",
                    { id: input.id },
                );
            }

            logger.info("Entity relation updated", { relationId: updated.id });
            await projectService.touchProject(String(current.projectId));
            await projectService.persistPackageAfterMutation(String(current.projectId), "entity-relation:update");
            return toEntityRelation(updated as RawRow);
        } catch (error) {
            logger.error("Failed to update entity relation", error);
            if (error instanceof ServiceError) throw error;
            throw new ServiceError(
                ErrorCode.ENTITY_RELATION_UPDATE_FAILED,
                "Failed to update entity relation",
                { input },
                error,
            );
        }
    }

    async deleteRelation(id: string) {
        try {
            const client = await this.getClient();
            const [deleted] = await client.delete(entityRelation).where(eq(entityRelation.id, id)).returning();
            if (!deleted) {
                throw new ServiceError(
                    ErrorCode.ENTITY_RELATION_NOT_FOUND,
                    "Entity relation not found",
                    { id },
                );
            }
            logger.info("Entity relation deleted", { relationId: id });
            await projectService.touchProject(String(deleted.projectId));
            await projectService.persistPackageAfterMutation(String(deleted.projectId), "entity-relation:delete");
            return { success: true };
        } catch (error) {
            logger.error("Failed to delete entity relation", error);
            if (error instanceof ServiceError) throw error;
            throw new ServiceError(
                ErrorCode.ENTITY_RELATION_DELETE_FAILED,
                "Failed to delete entity relation",
                { id },
                error,
            );
        }
    }

    /**
     * 프로젝트 전체 세계관 그래프 데이터 조회
     * Character / Faction / Event / Term / WorldEntity 를 한꺼번에 모아 WorldGraphNode 배열로 변환
     */
    async getWorldGraph(projectId: string): Promise<WorldGraphData> {
        try {
            const client = await this.getClient();
            const [characters, factions, events, terms, worldEntities, scenes, notes, synopses, plots, scraps, edges] = await Promise.all([
                client.select().from(character).where(and(eq(character.projectId, projectId), isNull(character.deletedAt))),
                client.select().from(faction).where(and(eq(faction.projectId, projectId), isNull(faction.deletedAt))),
                client.select().from(event).where(and(eq(event.projectId, projectId), isNull(event.deletedAt))),
                client.select().from(term).where(and(eq(term.projectId, projectId), isNull(term.deletedAt))),
                client.select().from(worldEntity).where(eq(worldEntity.projectId, projectId)),
                client.select().from(scene).where(eq(scene.projectId, projectId)),
                client.select().from(note).where(eq(note.projectId, projectId)),
                client.select().from(synopsis).where(eq(synopsis.projectId, projectId)),
                client.select().from(plot).where(eq(plot.projectId, projectId)),
                client.select().from(scrapMemo).where(eq(scrapMemo.projectId, projectId)),
                client.select().from(entityRelation).where(eq(entityRelation.projectId, projectId)),
            ]);

            const nodes: WorldGraphNode[] = [
                ...characters.map((c): WorldGraphNode => ({
                    id: c.id,
                    entityType: "Character" as WorldEntitySourceType,
                    name: c.name,
                    description: c.description,
                    firstAppearance: c.firstAppearance,
                    attributes: parseAttributes(c.attributes),
                    positionX: 0,
                    positionY: 0,
                })),
                ...factions.map((f): WorldGraphNode => ({
                    id: f.id,
                    entityType: "Faction" as WorldEntitySourceType,
                    name: f.name,
                    description: f.description,
                    firstAppearance: f.firstAppearance,
                    attributes: parseAttributes(f.attributes),
                    positionX: 0,
                    positionY: 0,
                })),
                ...events.map((e): WorldGraphNode => ({
                    id: e.id,
                    entityType: "Event" as WorldEntitySourceType,
                    name: e.name,
                    description: e.description,
                    firstAppearance: e.firstAppearance,
                    attributes: parseAttributes(e.attributes),
                    positionX: 0,
                    positionY: 0,
                })),
                ...terms.map((t): WorldGraphNode => ({
                    id: t.id,
                    entityType: "Term" as WorldEntitySourceType,
                    name: t.term,
                    description: t.definition ?? null,
                    firstAppearance: t.firstAppearance,
                    attributes: t.category ? { tags: [t.category] } : null,
                    positionX: 0,
                    positionY: 0,
                })),
                ...worldEntities.map((w): WorldGraphNode => ({
                    id: w.id,
                    entityType: (w.type ?? "Place") as WorldEntitySourceType,
                    subType: (w.type ?? "Place") as WorldEntityType,
                    name: w.name,
                    description: w.description,
                    firstAppearance: w.firstAppearance,
                    attributes: parseAttributes(w.attributes),
                    positionX: w.positionX ?? 0,
                    positionY: w.positionY ?? 0,
                })),
                ...scenes.map((item): WorldGraphNode => ({
                    id: `scene:${item.id}`,
                    entityType: "WorldEntity",
                    subType: "Concept",
                    name: `Scene · ${item.title}`,
                    description: item.body?.slice(0, 240) ?? null,
                    firstAppearance: null,
                    attributes: { sourceType: "scene", sourceId: item.id, chapterId: item.chapterId },
                    positionX: 0,
                    positionY: 0,
                })),
                ...notes.map((item): WorldGraphNode => ({
                    id: `note:${item.id}`,
                    entityType: "WorldEntity",
                    subType: "Concept",
                    name: `Note · ${item.title}`,
                    description: item.body?.slice(0, 240) ?? null,
                    firstAppearance: null,
                    attributes: { sourceType: "note", sourceId: item.id, chapterId: item.chapterId ?? null },
                    positionX: 0,
                    positionY: 0,
                })),
                ...synopses.map((item): WorldGraphNode => ({
                    id: `synopsis:${item.id}`,
                    entityType: "WorldEntity",
                    subType: "Rule",
                    name: `Synopsis · ${item.title}`,
                    description: item.body?.slice(0, 240) ?? null,
                    firstAppearance: null,
                    attributes: { sourceType: "synopsis", sourceId: item.id, chapterId: item.chapterId ?? null },
                    positionX: 0,
                    positionY: 0,
                })),
                ...plots.map((item): WorldGraphNode => ({
                    id: `plot:${item.id}`,
                    entityType: "WorldEntity",
                    subType: "Rule",
                    name: `Plot · ${item.title}`,
                    description: item.body?.slice(0, 240) ?? null,
                    firstAppearance: null,
                    attributes: { sourceType: "plot", sourceId: item.id },
                    positionX: 0,
                    positionY: 0,
                })),
                ...scraps.map((item): WorldGraphNode => ({
                    id: `scrap:${item.id}`,
                    entityType: "WorldEntity",
                    subType: "Item",
                    name: `Scrap · ${item.title}`,
                    description: item.content?.slice(0, 240) ?? null,
                    firstAppearance: null,
                    attributes: {
                        sourceType: "scrapMemo",
                        sourceId: item.id,
                        tags: (() => {
                            try {
                                return JSON.parse(item.tags ?? "[]") as string[];
                            } catch {
                                return [];
                            }
                        })(),
                    },
                    positionX: 0,
                    positionY: 0,
                })),
            ];

            const typedEdges: EntityRelation[] = edges.map((e): EntityRelation => ({
                id: e.id,
                projectId: e.projectId ?? projectId,
                sourceId: e.sourceId ?? "",
                sourceType: (e.sourceType ?? "Character") as WorldEntitySourceType,
                targetId: e.targetId ?? "",
                targetType: (e.targetType ?? "Character") as WorldEntitySourceType,
                relation: (e.relation ?? "belongs_to") as RelationKind,
                attributes: e.attributes ? (parseAttributes(e.attributes) as Record<string, unknown>) : null,
                sourceWorldEntityId: e.sourceWorldEntityId ?? null,
                targetWorldEntityId: e.targetWorldEntityId ?? null,
                createdAt: (e.createdAt as string | Date) ?? new Date(),
                updatedAt: (e.updatedAt as string | Date) ?? new Date(),
            }));

            const nodeIds = new Set(nodes.map((node) => node.id));
            const filteredEdges = typedEdges.filter(
                (edge) => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId),
            );

            return { nodes, edges: filteredEdges };
        } catch (error) {
            logger.error("Failed to get world graph", error);
            throw new ServiceError(
                ErrorCode.DB_QUERY_FAILED,
                "Failed to get world graph",
                { projectId },
                error,
            );
        }
    }

    async cleanupOrphanRelationsAcrossProjects(options?: { dryRun?: boolean }): Promise<{
        scannedProjects: number;
        scannedRelations: number;
        orphanRelations: number;
        removedRelations: number;
    }> {
        const dryRun = options?.dryRun ?? false;
        const client = await this.getClient();
        const projects = await client.select({ id: project.id }).from(project);

        let scannedRelations = 0;
        let orphanRelations = 0;
        let removedRelations = 0;

            for (const proj of projects) {
            const projectId = String(proj.id);
            const [characters, factions, events, terms, worldEntities, relations] = await Promise.all([
                client.select({ id: character.id }).from(character).where(and(eq(character.projectId, projectId), isNull(character.deletedAt))),
                client.select({ id: faction.id }).from(faction).where(and(eq(faction.projectId, projectId), isNull(faction.deletedAt))),
                client.select({ id: event.id }).from(event).where(and(eq(event.projectId, projectId), isNull(event.deletedAt))),
                client.select({ id: term.id }).from(term).where(and(eq(term.projectId, projectId), isNull(term.deletedAt))),
                client.select({ id: worldEntity.id }).from(worldEntity).where(eq(worldEntity.projectId, projectId)),
                client.select({ id: entityRelation.id, sourceId: entityRelation.sourceId, targetId: entityRelation.targetId }).from(entityRelation).where(eq(entityRelation.projectId, projectId)),
            ]);

            const nodeIds = new Set<string>([
                ...characters.map((item: { id: string }) => String(item.id)),
                ...factions.map((item: { id: string }) => String(item.id)),
                ...events.map((item: { id: string }) => String(item.id)),
                ...terms.map((item: { id: string }) => String(item.id)),
                ...worldEntities.map((item: { id: string }) => String(item.id)),
            ]);

            const orphanIds = relations
                .filter((relation: { sourceId: string; targetId: string }) => !nodeIds.has(String(relation.sourceId)) || !nodeIds.has(String(relation.targetId)))
                .map((relation: { id: string }) => String(relation.id));

            scannedRelations += relations.length;
            orphanRelations += orphanIds.length;

            if (orphanIds.length === 0 || dryRun) {
                continue;
            }

            const result = await client.delete(entityRelation).where(and(eq(entityRelation.projectId, projectId), inArray(entityRelation.id, orphanIds)));
            removedRelations += result.changes;
            if (result.changes > 0) {
                await projectService.touchProject(projectId);
                await projectService.persistPackageAfterMutation(projectId, "entity-relation:cleanup-orphans");
            }
        }

        logger.info("Entity relation orphan cleanup completed", {
            dryRun,
            scannedProjects: projects.length,
            scannedRelations,
            orphanRelations,
            removedRelations,
        });

        return {
            scannedProjects: projects.length,
            scannedRelations,
            orphanRelations,
            removedRelations,
        };
    }
}

export const entityRelationService = new EntityRelationService();
