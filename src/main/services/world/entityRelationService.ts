/**
 * EntityRelation service — 세계관 6종 관계 CRUD + 그래프 조회
 */

import { asc, eq } from "drizzle-orm";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import { isRelationAllowed } from "../../../shared/constants/world/relationRules.js";
import type {
  EntityRelationCreateInput,
  EntityRelationUpdateInput,
  WorldGraphData,
  WorldEntitySourceType,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/error/index.js";
import { projectService } from "../core/projectService.js";
import { db } from "../../infra/database/index.js";
import { entityRelation } from "../../infra/database/index.js";
import { buildWorldGraph } from "./entityRelationGraph.js";
import {
  cleanupOrphanRelationsAcrossProjects,
  reconcileWorldEntityPointersAcrossProjects,
} from "./entityRelationMaintenance.js";
import {
  type EntityRelationRawRow,
  toEntityRelation,
} from "./entityRelationMapper.js";
import { buildCanonicalWorldEntityPointers } from "./entityRelationPointers.js";

const logger = createLogger("EntityRelationService");

export class EntityRelationService {
  private async getClient() {
    return db.getClient();
  }

  async createRelation(input: EntityRelationCreateInput) {
    try {
      logger.info("Creating entity relation", input);

      if (
        !isRelationAllowed(input.relation, input.sourceType, input.targetType)
      ) {
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

      Object.assign(
        insertData,
        buildCanonicalWorldEntityPointers({
          sourceId: input.sourceId,
          sourceType: input.sourceType,
          targetId: input.targetId,
          targetType: input.targetType,
        }),
      );

      const client = await this.getClient();
      const [result] = await client
        .insert(entityRelation)
        .values(insertData)
        .returning();

      if (!result) {
        throw new ServiceError(
          ErrorCode.ENTITY_RELATION_CREATE_FAILED,
          "Failed to create entity relation",
          { input },
        );
      }

      logger.info("Entity relation created", { relationId: result.id });
      await projectService.touchProject(input.projectId);
      await projectService.persistPackageAfterMutation(
        input.projectId,
        "entity-relation:create",
      );
      return toEntityRelation(result as EntityRelationRawRow);
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
      const relations = await client
        .select()
        .from(entityRelation)
        .where(eq(entityRelation.projectId, projectId))
        .orderBy(asc(entityRelation.createdAt));

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
      const currentResults = await client
        .select()
        .from(entityRelation)
        .where(eq(entityRelation.id, input.id))
        .limit(1);
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
      Object.assign(
        updateData,
        buildCanonicalWorldEntityPointers({
          sourceId: String(current.sourceId),
          sourceType: current.sourceType as WorldEntitySourceType,
          targetId: String(current.targetId),
          targetType: current.targetType as WorldEntitySourceType,
        }),
      );

      const [updated] = await client
        .update(entityRelation)
        .set(updateData)
        .where(eq(entityRelation.id, input.id))
        .returning();

      if (!updated) {
        throw new ServiceError(
          ErrorCode.ENTITY_RELATION_NOT_FOUND,
          "Entity relation not found",
          { id: input.id },
        );
      }

      logger.info("Entity relation updated", { relationId: updated.id });
      await projectService.touchProject(String(current.projectId));
      await projectService.persistPackageAfterMutation(
        String(current.projectId),
        "entity-relation:update",
      );
      return toEntityRelation(updated as EntityRelationRawRow);
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
      const [deleted] = await client
        .delete(entityRelation)
        .where(eq(entityRelation.id, id))
        .returning();
      if (!deleted) {
        throw new ServiceError(
          ErrorCode.ENTITY_RELATION_NOT_FOUND,
          "Entity relation not found",
          { id },
        );
      }
      logger.info("Entity relation deleted", { relationId: id });
      await projectService.touchProject(String(deleted.projectId));
      await projectService.persistPackageAfterMutation(
        String(deleted.projectId),
        "entity-relation:delete",
      );
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
      return await buildWorldGraph(client, projectId);
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

  async cleanupOrphanRelationsAcrossProjects(options?: {
    dryRun?: boolean;
  }): Promise<{
    scannedProjects: number;
    scannedRelations: number;
    orphanRelations: number;
    removedRelations: number;
  }> {
    const dryRun = options?.dryRun ?? false;
    const client = await this.getClient();
    const result = await cleanupOrphanRelationsAcrossProjects({
      client,
      dryRun,
      onProjectMutation: async (projectId, reason) => {
        await projectService.touchProject(projectId);
        await projectService.persistPackageAfterMutation(projectId, reason);
      },
    });

    logger.info("Entity relation orphan cleanup completed", {
      dryRun,
      ...result,
    });

    return result;
  }

  async reconcileWorldEntityPointersAcrossProjects(options?: {
    dryRun?: boolean;
  }): Promise<{
    dryRun: boolean;
    scannedRelations: number;
    mismatchedRelations: number;
    fixedRelations: number;
  }> {
    const dryRun = options?.dryRun ?? false;
    const client = await this.getClient();
    const result = await reconcileWorldEntityPointersAcrossProjects({
      client,
      dryRun,
    });

    logger.info(
      "Entity relation world-entity pointer reconciliation completed",
      {
        ...result,
      },
    );

    return result;
  }
}

export const entityRelationService = new EntityRelationService();
