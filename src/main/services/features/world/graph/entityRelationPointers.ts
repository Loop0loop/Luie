import { isWorldEntityBackedType } from "../../../../../shared/constants/world/relationRules.js";
import type { WorldEntitySourceType } from "../../../../../shared/types/index.js";

export function buildCanonicalWorldEntityPointers(input: {
  sourceId: string;
  sourceType: WorldEntitySourceType;
  targetId: string;
  targetType: WorldEntitySourceType;
}): {
  sourceWorldEntityId: string | null;
  targetWorldEntityId: string | null;
} {
  // NOTE: world-entity-backed type의 pointer는 반드시 WorldEntity.id를 사용한다.
  return {
    sourceWorldEntityId: isWorldEntityBackedType(input.sourceType)
      ? input.sourceId
      : null,
    targetWorldEntityId: isWorldEntityBackedType(input.targetType)
      ? input.targetId
      : null,
  };
}
