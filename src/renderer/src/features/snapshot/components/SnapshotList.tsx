import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, RotateCcw, GitCompare, Loader2 } from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import { api } from "@shared/api";
import { DraggableItem } from "@shared/ui/DraggableItem";
import type { Snapshot } from "@shared/types";
import { useSplitView } from "@renderer/features/workspace/hooks/useSplitView";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useDialog } from "@shared/ui/useDialog";
import { useShallow } from "zustand/react/shallow";

interface SnapshotListProps {
  chapterId: string;
  onOpenSnapshot?: (snapshot: Snapshot) => void;
}

export function SnapshotList({ chapterId, onOpenSnapshot }: SnapshotListProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotItems, setSnapshotItems] = useState<
    Array<{ snapshot: Snapshot; formattedDate: string }>
  >([]);
  const { t } = useTranslation();
  const dialog = useDialog();

  const { handleOpenSnapshot } = useSplitView();
  const { loadAll: reloadChapters, items: chapters } = useChapterStore(
    useShallow((state) => ({
      loadAll: state.loadAll,
      items: state.items,
    })),
  );
  const currentChapter = chapters.find((chapter) => chapter.id === chapterId);

  const buildSnapshotItems = useCallback((items: Snapshot[]) => {
    return items.map((snapshot) => ({
      snapshot,
      formattedDate: snapshot.createdAt
        ? new Date(snapshot.createdAt).toLocaleString()
        : "",
    }));
  }, []);

  const loadSnapshots = useCallback(async () => {
    if (!chapterId) {
      api.logger.info("SnapshotList: No chapterId provided");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      api.logger.info(
        `SnapshotList: Loading snapshots for chapter ${chapterId}`,
      );
      const res = await api.snapshot.getByChapter(chapterId);
      if (res.success && res.data) {
        setSnapshots(res.data);
        setSnapshotItems(buildSnapshotItems(res.data));
        return;
      }
      setError(res.error?.message ?? t("snapshot.list.loadFailed"));
    } catch (error) {
      api.logger.error("Failed to load snapshots", error);
      setError(t("snapshot.list.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [chapterId, t, buildSnapshotItems]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void loadSnapshots();
    });
    return () => {
      cancelled = true;
    };
  }, [loadSnapshots, chapterId]);

  const displayItems = useMemo(
    () =>
      snapshotItems.length > 0 ? snapshotItems : buildSnapshotItems(snapshots),
    [snapshotItems, buildSnapshotItems, snapshots],
  );

  const handleCompare = (snapshot: Snapshot) => {
    if (onOpenSnapshot) {
      onOpenSnapshot(snapshot);
    } else {
      handleOpenSnapshot(snapshot);
    }
  };

  const handleRestore = async (snapshot: Snapshot) => {
    const confirmed = await dialog.confirm({
      title: t("snapshot.list.restoreTitle"),
      message: t("snapshot.list.confirmRestore"),
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      const response = await api.snapshot.restore(snapshot.id);
      if (response.success && snapshot.projectId) {
        await reloadChapters(snapshot.projectId);
      }
      // NOTE: 같은 챕터의 본문이 바뀌므로 Editor key 리비전을 올려 리마운트시킨다.
      useChapterStore.getState().bumpContentRevision();
      dialog.toast(t("snapshot.list.restoreSuccess"), "success");
    } catch (error) {
      api.logger.error("Snapshot restore failed", error);
      dialog.toast(t("snapshot.list.restoreFailed"), "error");
    }
  };

  const handleManualSnapshot = async () => {
    if (!currentChapter) {
      dialog.toast(t("snapshot.list.chapterNotFound"), "error");
      return;
    }

    const memo = await dialog.prompt({
      title: t("snapshot.list.manualButton"),
      message: t("snapshot.list.memoPrompt"),
      defaultValue: "",
      placeholder: t("snapshot.list.memoPrompt"),
    });
    if (memo === null) return;

    try {
      const response = await api.snapshot.create({
        projectId: currentChapter.projectId,
        chapterId: currentChapter.id,
        content: currentChapter.content ?? "",
        description: memo.trim() || t("snapshot.list.manualDescription"),
        type: "MANUAL",
      });

      if (response.success) {
        await loadSnapshots();
        dialog.toast(t("snapshot.list.manualCreated"), "success");
      }
    } catch (error) {
      api.logger.error("Failed to create manual snapshot", error);
      dialog.toast(t("snapshot.list.createFailed"), "error");
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-xs text-muted flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t("snapshot.list.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-xs text-muted flex flex-col gap-2">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => loadSnapshots()}
          className="self-start text-xs px-2 py-1 rounded bg-surface-hover text-fg hover:bg-active transition-colors"
        >
          {t("snapshot.list.retry")}
        </button>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="p-4 text-xs text-muted flex flex-col items-center justify-center h-full opacity-60">
        <Clock className="mb-2 w-8 h-8 opacity-20" />
        {t("snapshot.list.empty")}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-2">
        <button
          onClick={handleManualSnapshot}
          className="rounded-[24px] border border-border px-3 py-1.5 text-xs text-accent transition-colors hover:border-accent hover:text-fg"
        >
          {t("snapshot.list.manualButton")}
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <Virtuoso
          className="h-full"
          data={displayItems}
          itemContent={(_index, item) => (
            <DraggableItem
              key={item.snapshot.id}
              id={`snapshot-${item.snapshot.id}`}
              data={{
                type: "snapshot",
                id: item.snapshot.id,
                title: `Snapshot: ${item.formattedDate}`,
                snapshot: item.snapshot,
              }}
            >
              <div className="group relative m-2 rounded-panel bg-surface/50 p-2 transition-colors hover:bg-surface-hover">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="text-xs font-semibold text-fg"
                    suppressHydrationWarning
                  >
                    {item.formattedDate}
                  </span>
                  {item.snapshot.type === "MANUAL" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                      {t("snapshot.list.manualBadge")}
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompare(item.snapshot);
                      }}
                      className="p-1 hover:bg-active rounded text-accent"
                      title={t("snapshot.list.compareTitle")}
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(item.snapshot);
                      }}
                      className="p-1 hover:bg-active rounded text-muted hover:text-fg"
                      title={t("snapshot.list.restoreTitle")}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-muted line-clamp-1">
                  {item.snapshot.description ||
                    t("snapshot.list.autoDescription")}
                </div>
              </div>
            </DraggableItem>
          )}
        />
      </div>
    </div>
  );
}
