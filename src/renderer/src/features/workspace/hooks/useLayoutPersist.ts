import { useCallback, useEffect, useRef } from "react";
import type { Layout } from "react-resizable-panels";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";
import {
  normalizeLayoutSurfaceRatioInput,
  type LayoutSurfaceId,
} from "@renderer/shared/constants/layoutSizing";
import { createLogger } from "@shared/logger";
import { isLayoutRestoring } from "./useSidebarResizeCommit";
import { SIDEBAR_RESIZE_COMMIT_IDLE_MS } from "@renderer/features/workspace/constants/uiDefaults";

const logger = createLogger("useLayoutPersist");
let layoutPersistenceSuppressionDepth = 0;

export function suppressLayoutPersistenceFor(durationMs: number): void {
  layoutPersistenceSuppressionDepth += 1;
  window.setTimeout(() => {
    layoutPersistenceSuppressionDepth = Math.max(
      0,
      layoutPersistenceSuppressionDepth - 1,
    );
  }, durationMs);
}

const isLayoutPersistenceSuppressed = (): boolean =>
  layoutPersistenceSuppressionDepth > 0;

/**
 * 프로그램이 만든 layout 변화인지 판정하는 단일 진입점.
 *
 * 억제 신호가 두 갈래로 존재한다. `suppressLayoutPersistenceFor`가 올리는 module counter와
 * `beginLayoutRestoring`이 세팅하는 `data-layout-restoring` DOM 속성이다. 저장 경로가 둘 중
 * 하나만 확인하면 다른 경로로 들어온 프로그램적 resize가 사용자 값으로 오인되어 저장된다.
 * 새 저장 경로는 개별 신호가 아니라 이 함수를 쓴다.
 */
export const isProgrammaticLayoutChange = (): boolean =>
  isLayoutRestoring() || isLayoutPersistenceSuppressed();

export const isPersistableLayoutRatio = (ratio: number): boolean =>
  Number.isFinite(ratio) && ratio > 0.1;

export interface LayoutPersistEntry {
  /** `Panel.id`와 같은 값. */
  id: string;
  /** react-resizable-panels가 id를 주지 않을 때 사용할 layout index. */
  index?: number;
  /** 계산한 ratio를 저장할 uiStore key. */
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
  return getPanelLayoutValue(layout, entry.id, entry.index ?? index);
};

/** PanelGroup의 drag 결과 비율을 저장해 monitor 너비가 달라도 같은 layout 비율을 유지한다. */
export function useLayoutPersist(
  entries: LayoutPersistEntry[],
  options?: UseLayoutPersistOptions,
) {
  const setLayoutSurfaceRatio = useUIStore(
    (state) => state.setLayoutSurfaceRatio,
  );
  const entriesRef = useRef(entries);
  const projectIdRef = useRef(options?.projectId ?? null);
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
  }, [options?.projectId]);

  // NOTE: hydration 플래그와 store action은 렌더에서 쓰지 않는다. 구독하면 hydration이
  // 끝나는 순간 이 hook을 쓰는 모든 layout이 리렌더된다. 호출 시점에 읽는다.
  const flushPendingCommits = useCallback(() => {
    const pendingEntries = Array.from(pendingCommitRef.current.entries());
    pendingCommitRef.current.clear();
    const projectPatch: Partial<Record<LayoutSurfaceId, number>> = {};
    for (const [surface, ratio] of pendingEntries) {
      setLayoutSurfaceRatio(surface, ratio);
      projectPatch[surface] = ratio;
    }
    const projectId = projectIdRef.current;
    const { hasHydrated: projectLayoutHasHydrated, upsertProjectLayout } =
      useProjectLayoutStore.getState();
    if (
      projectId &&
      useUIStore.getState().hasHydrated &&
      projectLayoutHasHydrated &&
      Object.keys(projectPatch).length > 0
    ) {
      upsertProjectLayout(projectId, {
        layoutSurfaceRatios: projectPatch as Record<LayoutSurfaceId, number>,
      });
    }
  }, [setLayoutSurfaceRatio]);

  const scheduleCommitFlush = useCallback(() => {
    if (flushTimeoutRef.current !== null) {
      clearTimeout(flushTimeoutRef.current);
    }
    // NOTE: drag 중에는 중간 비율을 저장하지 않고, 포인터가 잠시 멈춘 최종 비율만 커밋한다.
    flushTimeoutRef.current = setTimeout(() => {
      flushTimeoutRef.current = null;
      flushPendingCommits();
    }, SIDEBAR_RESIZE_COMMIT_IDLE_MS);
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
          if (!isPersistableLayoutRatio(nextRatio)) {
            continue;
          }

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
