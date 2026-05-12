/**
 * Hook providing entity visualization data for a given entity.
 *
 * Currently returns a memoized slice of the placeholder mock bundle.
 * TODO(RAG): swap implementation to query the RAG service by `(kind, id)`
 * while keeping the return type stable so the UI does not change.
 */

import { useMemo } from "react";
import { MOCK_VISUAL_BUNDLE } from "./mockData";
import type { EntityKind, EntityVisualBundle } from "./types";

export function useEntityVisualData(
  kind: EntityKind,
  _id: string, // reserved for RAG lookup by entity id
): EntityVisualBundle {
  return useMemo(() => MOCK_VISUAL_BUNDLE[kind], [kind]);
}
