import {
  confirmMemoryEntity,
  rejectMemoryEntity,
} from "../entity/memoryEntityReviewService.js";
import {
  db,
  memoryEntity,
  memoryFact,
} from "../../../../infra/database/index.js";
import { and, eq, inArray } from "drizzle-orm";
import {
  confirmMemoryTemporalFact,
  rejectMemoryTemporalFact,
} from "../temporal/memoryTemporalFactReviewService.js";

export type MemoryReviewDecisionAction = "confirm" | "reject";

export type MemoryReviewEntityDecision = {
  id: string;
  action: string;
};

export type MemoryReviewFactDecision = {
  id: string;
  action: string;
  reason?: string;
};

export type MemoryReviewDecisionInput = {
  projectId: string;
  entities?: MemoryReviewEntityDecision[];
  facts?: MemoryReviewFactDecision[];
};

export type MemoryReviewDecisionApplyItemResult = {
  kind: "entity" | "fact";
  id: string;
  action: string;
  updated: boolean;
  status?: "confirmed" | "rejected";
  error?: string;
};

export type MemoryReviewDecisionApplyResult = {
  projectId: string;
  attempted: number;
  updated: number;
  failed: number;
  persisted: boolean;
  results: MemoryReviewDecisionApplyItemResult[];
};

type ApplyOptions = {
  nowIso?: string;
  persistPackageAfterMutation?: (projectId: string, reason: string) => Promise<void>;
};

const rejectReasonForFact = (decision: MemoryReviewFactDecision): string => {
  const reason = decision.reason?.trim();
  if (!reason) {
    throw new Error("Fact rejection requires a non-empty reason");
  }
  return reason;
};

const validateAction = (action: string): void => {
  if (action !== "confirm" && action !== "reject") {
    throw new Error(`Unsupported review decision action: ${action}`);
  }
};

export function validateMemoryReviewDecisions(
  input: MemoryReviewDecisionInput,
): MemoryReviewDecisionApplyResult {
  const results: MemoryReviewDecisionApplyItemResult[] = [];

  for (const decision of input.entities ?? []) {
    try {
      validateAction(decision.action);
      results.push({
        kind: "entity",
        id: decision.id,
        action: decision.action,
        updated: false,
      });
    } catch (error) {
      results.push({
        kind: "entity",
        id: decision.id,
        action: decision.action,
        updated: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const decision of input.facts ?? []) {
    try {
      validateAction(decision.action);
      if (decision.action === "reject") {
        rejectReasonForFact(decision);
      }
      results.push({
        kind: "fact",
        id: decision.id,
        action: decision.action,
        updated: false,
      });
    } catch (error) {
      results.push({
        kind: "fact",
        id: decision.id,
        action: decision.action,
        updated: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    projectId: input.projectId,
    attempted: results.length,
    updated: 0,
    failed: results.filter((result) => result.error).length,
    persisted: false,
    results,
  };
}

export async function validateMemoryReviewDecisionsAgainstDb(
  input: MemoryReviewDecisionInput,
): Promise<MemoryReviewDecisionApplyResult> {
  const result = validateMemoryReviewDecisions(input);
  const entityIds = (input.entities ?? []).map((decision) => decision.id);
  const factIds = (input.facts ?? []).map((decision) => decision.id);

  const [entityRows, factRows] = await Promise.all([
    entityIds.length === 0
      ? Promise.resolve([])
      : db
          .getClient()
          .select({ id: memoryEntity.id, status: memoryEntity.status })
          .from(memoryEntity)
          .where(
            and(
              eq(memoryEntity.projectId, input.projectId),
              inArray(memoryEntity.id, entityIds),
            ),
          ),
    factIds.length === 0
      ? Promise.resolve([])
      : db
          .getClient()
          .select({ id: memoryFact.id, status: memoryFact.status })
          .from(memoryFact)
          .where(
            and(
              eq(memoryFact.projectId, input.projectId),
              inArray(memoryFact.id, factIds),
            ),
          ),
  ]);

  const entityStatus = new Map(entityRows.map((row) => [row.id, row.status]));
  const factStatus = new Map(factRows.map((row) => [row.id, row.status]));

  const results = result.results.map((item) => {
    const status =
      item.kind === "entity"
        ? entityStatus.get(item.id)
        : factStatus.get(item.id);
    if (!status) {
      return {
        ...item,
        error: item.error ?? `${item.kind} review candidate not found`,
      };
    }
    if (status !== "suggested") {
      return {
        ...item,
        status: status === "confirmed" || status === "rejected" ? status : item.status,
        error: item.error ?? `${item.kind} review candidate is not suggested: ${status}`,
      };
    }
    return item;
  });

  return {
    ...result,
    failed: results.filter((item) => item.error).length,
    results,
  };
}

export async function applyMemoryReviewDecisions(
  input: MemoryReviewDecisionInput,
  options: ApplyOptions = {},
): Promise<MemoryReviewDecisionApplyResult> {
  const results: MemoryReviewDecisionApplyItemResult[] = [];

  for (const decision of input.entities ?? []) {
    try {
      validateAction(decision.action);
      const mutation =
        decision.action === "confirm"
          ? await confirmMemoryEntity({
              projectId: input.projectId,
              entityId: decision.id,
              nowIso: options.nowIso,
            })
          : await rejectMemoryEntity({
              projectId: input.projectId,
              entityId: decision.id,
              nowIso: options.nowIso,
            });
      results.push({
        kind: "entity",
        id: decision.id,
        action: decision.action,
        updated: mutation.updated,
        status: mutation.status,
      });
    } catch (error) {
      results.push({
        kind: "entity",
        id: decision.id,
        action: decision.action,
        updated: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const decision of input.facts ?? []) {
    try {
      validateAction(decision.action);
      const mutation =
        decision.action === "confirm"
          ? await confirmMemoryTemporalFact({
              projectId: input.projectId,
              factId: decision.id,
              nowIso: options.nowIso,
            })
          : await rejectMemoryTemporalFact({
              projectId: input.projectId,
              factId: decision.id,
              reason: rejectReasonForFact(decision),
              nowIso: options.nowIso,
            });
      results.push({
        kind: "fact",
        id: decision.id,
        action: decision.action,
        updated: mutation.updated,
        status: mutation.status,
      });
    } catch (error) {
      results.push({
        kind: "fact",
        id: decision.id,
        action: decision.action,
        updated: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const updated = results.filter((result) => result.updated).length;
  let persisted = false;
  if (updated > 0 && options.persistPackageAfterMutation) {
    await options.persistPackageAfterMutation(input.projectId, "memory:review-decision-apply");
    persisted = true;
  }

  return {
    projectId: input.projectId,
    attempted: results.length,
    updated,
    failed: results.filter((result) => result.error).length,
    persisted,
    results,
  };
}
