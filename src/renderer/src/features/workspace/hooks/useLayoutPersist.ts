import { useCallback, useEffect, useRef } from "react";
import type { Layout } from "react-resizable-panels";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import type { SidebarWidthFeature } from "@shared/constants/sidebarSizing";
import {
    clampSidebarWidthForAnyFeature,
    getSidebarWidthConfig,
} from "@shared/constants/sidebarSizing";
import { createLogger } from "@shared/logger";

const logger = createLogger("useLayoutPersist");

export interface LayoutPersistEntry {
    /** Must match the Panel's `id` prop */
    id: string;
    /** uiStore key to save the resulting pixel width to */
    feature: SidebarWidthFeature;
}

/**
 * Hook that wires Group.onLayoutChanged to uiStore.setSidebarWidth.
 * It reads actual rendered pixel widths from the DOM, bypassing the complex
 * percent/pixel conversion issues in react-resizable-panels.
 */
export function useLayoutPersist(entries: LayoutPersistEntry[]) {
    const setSidebarWidth = useUIStore((state) => state.setSidebarWidth);
    const entriesRef = useRef(entries);
    const lastCommitRef = useRef(
        new Map<SidebarWidthFeature, { width: number; timestampMs: number }>(),
    );
    const isHandlingLayoutRef = useRef(false);

    useEffect(() => {
        entriesRef.current = entries;
    }, [entries]);

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
                    // layout map contains panel id -> flexGrow; we only use it as presence signal.
                    const flexGrow = layout[entry.id];
                    if (typeof flexGrow !== "number") continue;

                    const el = document.getElementById(String(entry.id));
                    if (!el) {
                        logger.warn(`[useLayoutPersist] Panel element not found in DOM`, { entryId: entry.id });
                        continue;
                    }

                    const renderedWidthPx = el.getBoundingClientRect().width;
                    if (renderedWidthPx <= 0) {
                        logger.warn(`[useLayoutPersist] Rendered width <= 0`, { entryId: entry.id, renderedWidthPx });
                        continue;
                    }

                    const config = getSidebarWidthConfig(entry.feature);
                    const clampedPx = clampSidebarWidthForAnyFeature(
                        entry.feature,
                        renderedWidthPx,
                    );

                    logger.info(`[useLayoutPersist] Evaluated width`, {
                        feature: entry.feature,
                        rawWidthPx: renderedWidthPx,
                        clampedPx,
                        configMin: config.minPx,
                        configMax: config.maxPx,
                    });

                    if (clampedPx < config.minPx || clampedPx > config.maxPx) {
                        logger.warn(`[useLayoutPersist] Skipping commit, out of bounds`, { feature: entry.feature, clampedPx });
                        continue;
                    }

                    const previousCommit = lastCommitRef.current.get(entry.feature);
                    if (
                        previousCommit &&
                        Math.abs(previousCommit.width - clampedPx) < 2 &&
                        nowMs - previousCommit.timestampMs < 600
                    ) {
                        logger.debug(`[useLayoutPersist] Skipping deduped commit`, {
                            feature: entry.feature,
                            clampedPx,
                        });
                        continue;
                    }

                    logger.info(`[useLayoutPersist] Committing width to store`, { feature: entry.feature, clampedPx });
                    lastCommitRef.current.set(entry.feature, { width: clampedPx, timestampMs: nowMs });
                    setSidebarWidth(entry.feature, clampedPx);
                }
            } finally {
                isHandlingLayoutRef.current = false;
            }
        },
        [setSidebarWidth],
    );
}
