import { isWorldEntityBackedType } from "../../../shared/constants/world/relationRules.js";
import type { WorldEntitySourceType } from "../../../shared/types/index.js";

export function buildCanonicalWorldEntityPointers(input: {
  sourceId: string;
  sourceType: WorldEntitySourceType;
  targetId: string;
  targetType: WorldEntitySourceType;
}): {
  sourceWorldEntityId: string | null;
  targetWorldEntityId: string | null;
} {
  // world-entity-backed 타입이면 sourceId/targetId는 WorldEntity.id여야 한다.
  return {
    sourceWorldEntityId: isWorldEntityBackedType(input.sourceType)
      ? input.sourceId
      : null,
    targetWorldEntityId: isWorldEntityBackedType(input.targetType)
      ? input.targetId
      : null,
  };
}
