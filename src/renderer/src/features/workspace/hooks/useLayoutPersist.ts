import { useCallback, useEffect, useRef } from "react";
import type { Layout } from "react-resizable-panels";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";
import {
  normalizeLayoutSurfaceRatioInput,
  type LayoutSurfaceId,
} from "@shared/constants/layoutSizing";
import { createLogger } from "@shared/logger";

const logger = createLogger("useLayoutPersist");
let layoutPersistSuppressionDepth = 0;

export function suppressLayoutPersistenceFor(durationMs: number): void {
  layoutPersistSuppressionDepth += 1;
  window.setTimeout(() => {
    layoutPersistSuppressionDepth = Math.max(0, layoutPersistSuppressionDepth - 1);
  }, durationMs);
}

const isLayoutPersistenceSuppressed = (): boolean =>
  layoutPersistSuppressionDepth > 0;

export interface LayoutPersistEntry {
  /** Must match the Panel's `id` prop */
  id: string;
  /** uiStore key to save the resulting ratio to */
  surface: LayoutSurfaceId;
}

type UseLayoutPersistOptions = {
  projectId?: string | null;
};

const readPanelLayoutValue = (value: unknown): unknown => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const valueRecord = value as Record<string, unknown>;
  if (typeof valueRecord.size === "number") {
    return valueRecord.size;
  }
  if (typeof valueRecord.asPercentage === "number") {
    return valueRecord.asPercentage;
  }
  if (typeof valueRecord.percentage === "number") {
    return valueRecord.percentage;
  }
  if (typeof valueRecord.flexGrow === "number") {
    return valueRecord.flexGrow;
  }
  return value;
};

export const getPanelLayoutValue = (
  layout: unknown,
  panelId: string,
  index: number,
): unknown => {
  const recordLayout =
    layout && typeof layout === "object" && !Array.isArray(layout)
      ? (layout as Record<string, unknown>)
      : null;

  if (recordLayout) {
    const keyed = recordLayout[panelId];
    if (keyed !== undefined) {
      return readPanelLayoutValue(keyed);
    }
  }

  if (Array.isArray(layout)) {
    return readPanelLayoutValue(layout[index]);
  }

  return undefined;
};

export const getPanelRatioFromLayout = (
  layout: unknown,
  entry: LayoutPersistEntry,
  index: number,
): unknown => {
  return getPanelLayoutValue(layout, entry.id, index);
};

/**
 * Hook that wires Group.onLayoutChanged to uiStore.setLayoutSurfaceRatio.
 * react-resizable-panels already reports stable percentages after each drag,
 * so layout-level surfaces can persist ratios directly and remain responsive
 * across different monitor widths.
 */
export function useLayoutPersist(
  entries: LayoutPersistEntry[],
  options?: UseLayoutPersistOptions,
) {
  const setLayoutSurfaceRatio = useUIStore(
    (state) => state.setLayoutSurfaceRatio,
  );
  const uiHasHydrated = useUIStore((state) => state.hasHydrated);
  const projectLayoutHasHydrated = useProjectLayoutStore(
    (state) => state.hasHydrated,
  );
  const upsertProjectLayout = useProjectLayoutStore(
    (state) => state.upsertProjectLayout,
  );
  const entriesRef = useRef(entries);
  const projectIdRef = useRef(options?.projectId ?? null);
  const canPersistProjectRef = useRef(false);
  const lastCommitRef = useRef(
    new Map<LayoutSurfaceId, { ratio: number; timestampMs: number }>(),
  );
  const isHandlingLayoutRef = useRef(false);
  const pendingCommitRef = useRef(new Map<LayoutSurfaceId, number>());
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnedEntriesRef = useRef(new Set<string>());

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    projectIdRef.current = options?.projectId ?? null;
    canPersistProjectRef.current = uiHasHydrated && projectLayoutHasHydrated;
  }, [options?.projectId, projectLayoutHasHydrated, uiHasHydrated]);

  const flushPendingCommits = useCallback(() => {
    const pendingEntries = Array.from(pendingCommitRef.current.entries());
    pendingCommitRef.current.clear();
    const projectPatch: Partial<Record<LayoutSurfaceId, number>> = {};
    for (const [surface, ratio] of pendingEntries) {
      setLayoutSurfaceRatio(surface, ratio);
      projectPatch[surface] = ratio;
    }
    const projectId = projectIdRef.current;
    if (
      projectId &&
      canPersistProjectRef.current &&
      Object.keys(projectPatch).length > 0
    ) {
      upsertProjectLayout(projectId, {
        layoutSurfaceRatios: projectPatch as Record<LayoutSurfaceId, number>,
      });
    }
  }, [setLayoutSurfaceRatio, upsertProjectLayout]);

  const scheduleCommitFlush = useCallback(() => {
    if (flushTimeoutRef.current !== null) return;
    flushTimeoutRef.current = setTimeout(() => {
      flushTimeoutRef.current = null;
      flushPendingCommits();
    }, 0);
  }, [flushPendingCommits]);

  useEffect(
    () => () => {
      if (flushTimeoutRef.current !== null) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      if (pendingCommitRef.current.size > 0) {
        flushPendingCommits();
      }
    },
    [flushPendingCommits],
  );

  return useCallback(
    (layout: Layout) => {
      if (isLayoutPersistenceSuppressed()) {
        logger.debug(`[useLayoutPersist] Suppressed layout surface commit`, {
          layout,
        });
        return;
      }
      if (isHandlingLayoutRef.current) {
        logger.warn(`[useLayoutPersist] Re-entrant onLayoutChanged ignored`);
        return;
      }
      isHandlingLayoutRef.current = true;
      try {
        const nowMs = Date.now();
        for (const [index, entry] of entriesRef.current.entries()) {
          const rawLayoutValue = getPanelRatioFromLayout(layout, entry, index);
          if (rawLayoutValue === undefined) {
            continue;
          }

          const nextRatio = normalizeLayoutSurfaceRatioInput(
            entry.surface,
            rawLayoutValue,
          );
          if (nextRatio === null) {
            const warningKey = `${entry.surface}:${entry.id}`;
            if (!warnedEntriesRef.current.has(warningKey)) {
              warnedEntriesRef.current.add(warningKey);
              logger.warn(`[useLayoutPersist] Invalid layout ratio`, {
                entryId: entry.id,
                entryIndex: index,
                surface: entry.surface,
                layoutValue: rawLayoutValue,
                layout,
              });
            }
            continue;
          }
          warnedEntriesRef.current.delete(`${entry.surface}:${entry.id}`);

          const previousCommit = lastCommitRef.current.get(entry.surface);
          if (
            previousCommit &&
            Math.abs(previousCommit.ratio - nextRatio) < 0.1 &&
            nowMs - previousCommit.timestampMs < 600
          ) {
            logger.debug(`[useLayoutPersist] Skipping deduped commit`, {
              surface: entry.surface,
              nextRatio,
            });
            continue;
          }

          logger.debug(`[useLayoutPersist] Committing layout surface ratio`, {
            surface: entry.surface,
            nextRatio,
          });
          lastCommitRef.current.set(entry.surface, {
            ratio: nextRatio,
            timestampMs: nowMs,
          });
          pendingCommitRef.current.set(entry.surface, nextRatio);
        }
        scheduleCommitFlush();
      } finally {
        isHandlingLayoutRef.current = false;
      }
    },
    [scheduleCommitFlush],
  );
}
