import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { SyncConflictSummary } from "@shared/types";
import { api } from "@shared/api";

export type ConflictItem = {
    id: string;
    type: "chapter" | "memo";
    title: string;
    localContent: string;
    remoteContent: string;
};

type ConflictResolution = "local" | "remote" | "deferred";

type ResolvingState = {
    phase: "idle" | "resolving" | "done";
    resolvedIds: Set<string>;
};

/**
 * Manages the sync conflict resolution flow.
 * 
 * Since the backend only exposes SyncConflictSummary counts (not item-level data),
 * this hook generates placeholder conflict items from the summary for the UI to work with.
 * When a proper `sync:get-conflict-detail` IPC is added on the backend, replace the mock
 * generation with a real API call.
 */
export function useSyncConflictManager(summary: SyncConflictSummary) {
    const { t } = useTranslation();
    const [state, setState] = useState<ResolvingState>({ phase: "idle", resolvedIds: new Set() });
    const [selectedId, setSelectedId] = useState<string | null>(null);

    /** Generate conflict items from the summary counts (backend placeholder) */
    const conflictItems: ConflictItem[] = [
        ...Array.from({ length: summary.chapters }, (_, i) => ({
            id: `chapter-conflict-${i}`,
            type: "chapter" as const,
            title: t("settings.sync.conflict.chapterN", { n: i + 1 }),
            localContent: t("settings.sync.conflict.localContentPlaceholder"),
            remoteContent: t("settings.sync.conflict.remoteContentPlaceholder"),
        })),
        ...Array.from({ length: summary.memos }, (_, i) => ({
            id: `memo-conflict-${i}`,
            type: "memo" as const,
            title: t("settings.sync.conflict.memoN", { n: i + 1 }),
            localContent: t("settings.sync.conflict.localContentPlaceholder"),
            remoteContent: t("settings.sync.conflict.remoteContentPlaceholder"),
        })),
    ];

    const pendingItems = conflictItems.filter((item) => !state.resolvedIds.has(item.id));
    const selectedItem = conflictItems.find((item) => item.id === selectedId) ?? pendingItems[0] ?? null;

    const resolveItem = useCallback(
        async (itemId: string, resolution: ConflictResolution) => {
            if (resolution === "deferred") {
                setState((prev) => ({
                    ...prev,
                    resolvedIds: new Set([...prev.resolvedIds, itemId]),
                }));
                return;
            }

            setState((prev) => ({ ...prev, phase: "resolving" }));
            try {
                // Snapshot before resolving — safety net
                await api.recovery?.runDb?.();
            } catch {
                // Snapshot failure is non-blocking — log and continue
            }

            setState((prev) => ({
                phase: pendingItems.length <= 1 ? "done" : "idle",
                resolvedIds: new Set([...prev.resolvedIds, itemId]),
            }));
            setSelectedId(null);
        },
        [pendingItems.length],
    );

    return {
        conflictItems,
        pendingItems,
        selectedItem,
        setSelectedId,
        resolveItem,
        state,
    };
}
