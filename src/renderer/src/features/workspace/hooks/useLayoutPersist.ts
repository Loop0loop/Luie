import { useCallback } from "react";
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

    return useCallback(
        (layout: Layout) => {
            logger.info(`[useLayoutPersist] onLayoutChanged triggered`, { layout });

            for (const entry of entries) {
                // layout array contains flexGrow numbers. We don't use them directly
                // because we want absolute pixels based on the user's screen size.
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

                // Only save if within strictly configured bounds 
                if (clampedPx >= config.minPx && clampedPx <= config.maxPx) {
                    logger.info(`[useLayoutPersist] Committing width to store`, { feature: entry.feature, clampedPx });
                    setSidebarWidth(entry.feature, clampedPx);
                } else {
                    logger.warn(`[useLayoutPersist] Skipping commit, out of bounds`, { feature: entry.feature, clampedPx });
                }
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [setSidebarWidth, ...entries.map((e) => e.id), ...entries.map((e) => e.feature)],
    );
}
