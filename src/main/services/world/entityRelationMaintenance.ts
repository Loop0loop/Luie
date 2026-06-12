import { and, eq, inArray, isNull } from "drizzle-orm";
import { isWorldEntityBackedType } from "../../../shared/constants/world/relationRules.js";
import type { WorldEntitySourceType } from "../../../shared/types/index.js";
import type { MainDrizzleClient } from "../../infra/database/index.js";
import {
  character,
  entityRelation,
  event,
  faction,
  note,
  plot,
  project,
  scene,
  scrapMemo,
  synopsis,
  term,
  worldEntity,
} from "../../infra/database/index.js";

type ProjectMutationCallback = (
  projectId: string,
  reason: string,
) => Promise<void>;

type IdRow = { id: string };

export async function cleanupOrphanRelationsAcrossProjects(input: {
  client: MainDrizzleClient;
  dryRun: boolean;
  onProjectMutation: ProjectMutationCallback;
}): Promise<{
  scannedProjects: number;
  scannedRelations: number;
  orphanRelations: number;
  removedRelations: number;
}> {
  const { client, dryRun, onProjectMutation } = input;
  const projects = await client.select({ id: project.id }).from(project);
  let scannedRelations = 0;
  let orphanRelations = 0;
  let removedRelations = 0;

  /* eslint-disable no-await-in-loop -- relation maintenance mutates one project at a time so package persistence remains scoped and ordered. */
  for (const proj of projects) {
    const projectId = String(proj.id);
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
      relations,
    ] = await Promise.all([
      client
        .select({ id: character.id })
        .from(character)
        .where(
          and(eq(character.projectId, projectId), isNull(character.deletedAt)),
        ),
      client
        .select({ id: faction.id })
        .from(faction)
        .where(
          and(eq(faction.projectId, projectId), isNull(faction.deletedAt)),
        ),
      client
        .select({ id: event.id })
        .from(event)
        .where(and(eq(event.projectId, projectId), isNull(event.deletedAt))),
      client
        .select({ id: term.id })
        .from(term)
        .where(and(eq(term.projectId, projectId), isNull(term.deletedAt))),
      client
        .select({ id: worldEntity.id })
        .from(worldEntity)
        .where(
          and(
            eq(worldEntity.projectId, projectId),
            isNull(worldEntity.deletedAt),
          ),
        ),
      client
        .select({ id: scene.id })
        .from(scene)
        .where(and(eq(scene.projectId, projectId), isNull(scene.deletedAt))),
      client
        .select({ id: note.id })
        .from(note)
        .where(and(eq(note.projectId, projectId), isNull(note.deletedAt))),
      client
        .select({ id: synopsis.id })
        .from(synopsis)
        .where(
          and(eq(synopsis.projectId, projectId), isNull(synopsis.deletedAt)),
        ),
      client
        .select({ id: plot.id })
        .from(plot)
        .where(and(eq(plot.projectId, projectId), isNull(plot.deletedAt))),
      client
        .select({ id: scrapMemo.id })
        .from(scrapMemo)
        .where(
          and(eq(scrapMemo.projectId, projectId), isNull(scrapMemo.deletedAt)),
        ),
      client
        .select({
          id: entityRelation.id,
          sourceId: entityRelation.sourceId,
          targetId: entityRelation.targetId,
        })
        .from(entityRelation)
        .where(eq(entityRelation.projectId, projectId)),
    ]);

    const nodeIds = new Set<string>([
      ...characters.map((item: IdRow) => String(item.id)),
      ...factions.map((item: IdRow) => String(item.id)),
      ...events.map((item: IdRow) => String(item.id)),
      ...terms.map((item: IdRow) => String(item.id)),
      ...worldEntities.map((item: IdRow) => String(item.id)),
      ...scenes.map((item: IdRow) => String(item.id)),
      ...notes.map((item: IdRow) => String(item.id)),
      ...synopses.map((item: IdRow) => String(item.id)),
      ...plots.map((item: IdRow) => String(item.id)),
      ...scraps.map((item: IdRow) => String(item.id)),
    ]);

    const orphanIds = relations
      .filter(
        (relation) =>
          !nodeIds.has(String(relation.sourceId)) ||
          !nodeIds.has(String(relation.targetId)),
      )
      .map((relation) => String(relation.id));

    scannedRelations += relations.length;
    orphanRelations += orphanIds.length;
    if (orphanIds.length === 0 || dryRun) continue;

    const result = await client
      .delete(entityRelation)
      .where(
        and(
          eq(entityRelation.projectId, projectId),
          inArray(entityRelation.id, orphanIds),
        ),
      );
    removedRelations += result.changes;
    if (result.changes > 0) {
      await onProjectMutation(projectId, "entity-relation:cleanup-orphans");
    }
  }
  /* eslint-enable no-await-in-loop */

  return {
    scannedProjects: projects.length,
    scannedRelations,
    orphanRelations,
    removedRelations,
  };
}

export async function reconcileWorldEntityPointersAcrossProjects(input: {
  client: MainDrizzleClient;
  dryRun: boolean;
}): Promise<{
  dryRun: boolean;
  scannedRelations: number;
  mismatchedRelations: number;
  fixedRelations: number;
}> {
  const { client, dryRun } = input;
  const relations = await client
    .select({
      id: entityRelation.id,
      sourceId: entityRelation.sourceId,
      sourceType: entityRelation.sourceType,
      targetId: entityRelation.targetId,
      targetType: entityRelation.targetType,
      sourceWorldEntityId: entityRelation.sourceWorldEntityId,
      targetWorldEntityId: entityRelation.targetWorldEntityId,
    })
    .from(entityRelation);

  let mismatchedRelations = 0;
  let fixedRelations = 0;

  /* eslint-disable no-await-in-loop -- pointer reconciliation updates rows sequentially to avoid write bursts during startup maintenance. */
  for (const relation of relations) {
    const expectedSourceWorldEntityId = isWorldEntityBackedType(
      relation.sourceType as WorldEntitySourceType,
    )
      ? String(relation.sourceId)
      : null;
    const expectedTargetWorldEntityId = isWorldEntityBackedType(
      relation.targetType as WorldEntitySourceType,
    )
      ? String(relation.targetId)
      : null;

    const sourceMismatch =
      (relation.sourceWorldEntityId ?? null) !== expectedSourceWorldEntityId;
    const targetMismatch =
      (relation.targetWorldEntityId ?? null) !== expectedTargetWorldEntityId;

    if (!sourceMismatch && !targetMismatch) continue;
    mismatchedRelations += 1;
    if (dryRun) continue;

    const result = await client
      .update(entityRelation)
      .set({
        sourceWorldEntityId: expectedSourceWorldEntityId,
        targetWorldEntityId: expectedTargetWorldEntityId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(entityRelation.id, relation.id));
    fixedRelations += result.changes;
  }
  /* eslint-enable no-await-in-loop */

  return {
    dryRun,
    scannedRelations: relations.length,
    mismatchedRelations,
    fixedRelations,
  };
}
