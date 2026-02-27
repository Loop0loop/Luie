/**
 * EntityRelation service — 세계관 6종 관계 CRUD + 그래프 조회
 */

import { db } from "../../database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
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

const logger = createLogger("EntityRelationService");

type RawRow = {
    id: string;
    name: string;
    description: string | null;
    firstAppearance: string | null;
    attributes: string | null;
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

function isPrismaNotFoundError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "P2025"
    );
}

function parseAttributes(raw: string | null | undefined): WorldEntityAttributes | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as WorldEntityAttributes;
    } catch {
        return null;
    }
}

export class EntityRelationService {
    async createRelation(input: EntityRelationCreateInput) {
        try {
            logger.info("Creating entity relation", input);

            const data: Record<string, unknown> = {
                projectId: input.projectId,
                sourceId: input.sourceId,
                sourceType: input.sourceType,
                targetId: input.targetId,
                targetType: input.targetType,
                relation: input.relation,
                attributes: input.attributes ? JSON.stringify(input.attributes) : null,
            };

            // FK 연결 — WorldEntity 타입인 경우에만 DB FK 설정
            if (input.sourceType === "WorldEntity") data.sourceWorldEntityId = input.sourceId;
            if (input.targetType === "WorldEntity") data.targetWorldEntityId = input.targetId;

            const relation = await db.getClient().entityRelation.create({ data });

            logger.info("Entity relation created", { relationId: relation.id });
            return relation;
        } catch (error) {
            logger.error("Failed to create entity relation", error);
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
            const relations = await db.getClient().entityRelation.findMany({
                where: { projectId },
                orderBy: { createdAt: "asc" },
            });

            return relations;
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
            const updateData: Record<string, unknown> = {};

            if (input.relation !== undefined) updateData.relation = input.relation;
            if (input.attributes !== undefined) {
                updateData.attributes = JSON.stringify(input.attributes);
            }

            const relation = await db.getClient().entityRelation.update({
                where: { id: input.id },
                data: updateData,
            });

            logger.info("Entity relation updated", { relationId: relation.id });
            return relation;
        } catch (error) {
            logger.error("Failed to update entity relation", error);
            if (isPrismaNotFoundError(error)) {
                throw new ServiceError(
                    ErrorCode.ENTITY_RELATION_NOT_FOUND,
                    "Entity relation not found",
                    { id: input.id },
                    error,
                );
            }
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
            await db.getClient().entityRelation.delete({ where: { id } });
            logger.info("Entity relation deleted", { relationId: id });
            return { success: true };
        } catch (error) {
            logger.error("Failed to delete entity relation", error);
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
     * Character / Faction / Event / WorldEntity 를 한꺼번에 모아 WorldGraphNode 배열로 변환
     */
    async getWorldGraph(projectId: string): Promise<WorldGraphData> {
        try {
            const [characters, factions, events, worldEntities, edges] = await Promise.all([
                db.getClient().character.findMany({ where: { projectId } }),
                db.getClient().faction.findMany({ where: { projectId } }),
                db.getClient().event.findMany({ where: { projectId } }),
                db.getClient().worldEntity.findMany({ where: { projectId } }),
                db.getClient().entityRelation.findMany({ where: { projectId } }),
            ]) as [RawRow[], RawRow[], RawRow[], RawRow[], RawRow[]];

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
                ...worldEntities.map((w): WorldGraphNode => ({
                    id: w.id,
                    entityType: "WorldEntity" as WorldEntitySourceType,
                    subType: (w.type ?? "Place") as WorldEntityType,
                    name: w.name,
                    description: w.description,
                    firstAppearance: w.firstAppearance,
                    attributes: parseAttributes(w.attributes),
                    positionX: w.positionX ?? 0,
                    positionY: w.positionY ?? 0,
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

            return { nodes, edges: typedEdges };
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
}

export const entityRelationService = new EntityRelationService();
