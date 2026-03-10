import { useCallback, useEffect, useRef } from "react";
import type { Layout } from "react-resizable-panels";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import {
    normalizeLayoutSurfaceRatioInput,
    type LayoutSurfaceId,
} from "@shared/constants/layoutSizing";
import { createLogger } from "@shared/logger";

const logger = createLogger("useLayoutPersist");

export interface LayoutPersistEntry {
    /** Must match the Panel's `id` prop */
    id: string;
    /** uiStore key to save the resulting ratio to */
    surface: LayoutSurfaceId;
}

/**
 * Hook that wires Group.onLayoutChanged to uiStore.setLayoutSurfaceRatio.
 * react-resizable-panels already reports stable percentages after each drag,
 * so layout-level surfaces can persist ratios directly and remain responsive
 * across different monitor widths.
 */
export function useLayoutPersist(entries: LayoutPersistEntry[]) {
    const setLayoutSurfaceRatio = useUIStore((state) => state.setLayoutSurfaceRatio);
    const entriesRef = useRef(entries);
    const lastCommitRef = useRef(
        new Map<LayoutSurfaceId, { ratio: number; timestampMs: number }>(),
    );
    const isHandlingLayoutRef = useRef(false);
    const pendingCommitRef = useRef(new Map<LayoutSurfaceId, number>());
    const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        entriesRef.current = entries;
    }, [entries]);

    const flushPendingCommits = useCallback(() => {
        const pendingEntries = Array.from(pendingCommitRef.current.entries());
        pendingCommitRef.current.clear();
        for (const [surface, ratio] of pendingEntries) {
            setLayoutSurfaceRatio(surface, ratio);
        }
    }, [setLayoutSurfaceRatio]);

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
            if (isHandlingLayoutRef.current) {
                logger.warn(`[useLayoutPersist] Re-entrant onLayoutChanged ignored`);
                return;
            }
            isHandlingLayoutRef.current = true;
            logger.info(`[useLayoutPersist] onLayoutChanged triggered`, { layout });
            try {
                const nowMs = Date.now();
                for (const entry of entriesRef.current) {
                    const nextRatio = normalizeLayoutSurfaceRatioInput(
                        entry.surface,
                        layout[entry.id],
                    );
                    if (nextRatio === null) {
                        logger.warn(`[useLayoutPersist] Invalid layout ratio`, {
                            entryId: entry.id,
                            surface: entry.surface,
                            layoutValue: layout[entry.id],
                        });
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

                    logger.info(`[useLayoutPersist] Committing layout surface ratio`, {
                        surface: entry.surface,
                        nextRatio,
                    });
                    lastCommitRef.current.set(entry.surface, { ratio: nextRatio, timestampMs: nowMs });
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
