import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, RotateCcw, GitCompare } from "lucide-react";
import { api } from "../../services/api";
import type { Snapshot } from "../../../../shared/types";
import { useSplitView } from "../../hooks/useSplitView";
import { useChapterStore } from "../../stores/chapterStore";

interface SnapshotListProps {
  chapterId: string;
}

export function SnapshotList({ chapterId }: SnapshotListProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  
  const { handleOpenSnapshot } = useSplitView();
  const { loadAll: reloadChapters, items: chapters } = useChapterStore();
  const currentChapter = chapters.find((chapter) => chapter.id === chapterId);

  useEffect(() => {
    async function loadSnapshots() {
      if (!chapterId) return;
      setLoading(true);
      try {
        const res = await api.snapshot.getByChapter(chapterId);
        if (res.success && res.data) {
          setSnapshots(res.data);
        }
      } catch (error) {
        api.logger.error("Failed to load snapshots", error);
      } finally {
        setLoading(false);
      }
    }
    loadSnapshots();
  }, [chapterId]);

  const handleCompare = (snapshot: Snapshot) => {
    handleOpenSnapshot(snapshot);
  };

  const handleRestore = async (snapshot: Snapshot) => {
      if (!window.confirm(t("snapshot.list.confirmRestore"))) return;
      
      try {
          const response = await api.snapshot.restore(snapshot.id);
          if (response.success && snapshot.projectId) {
            await reloadChapters(snapshot.projectId);
          }
        alert(t("snapshot.list.restoreSuccess"));
          // Trigger reload if needed
      } catch (error) {
          api.logger.error("Snapshot restore failed", error);
        alert(t("snapshot.list.restoreFailed"));
      }
  };

  const handleManualSnapshot = async () => {
    if (!currentChapter) {
      alert(t("snapshot.list.chapterNotFound"));
      return;
    }

    const memo = window.prompt(t("snapshot.list.memoPrompt"), "") ?? "";

    try {
      const response = await api.snapshot.create({
        projectId: currentChapter.projectId,
        chapterId: currentChapter.id,
        content: currentChapter.content ?? "",
        description: memo || t("snapshot.list.manualDescription"),
        type: "MANUAL",
      });

      if (response.success) {
        const res = await api.snapshot.getByChapter(chapterId);
        if (res.success && res.data) {
          setSnapshots(res.data);
        }
      }
    } catch (error) {
      api.logger.error("Failed to create manual snapshot", error);
      alert(t("snapshot.list.createFailed"));
    }
  };

  if (loading) {
    return <div className="p-4 text-xs text-muted">{t("snapshot.list.loading")}</div>;
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
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b border-border bg-surface/60">
        <button
          onClick={handleManualSnapshot}
          className="text-xs px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
        >
          {t("snapshot.list.manualButton")}
        </button>
      </div>
      {snapshots.map((snap) => (
        <div
          key={snap.id}
          className="p-3 border-b border-border hover:bg-surface-hover transition-colors group relative"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-fg">
              {new Date(snap.createdAt).toLocaleString()}
            </span>
            {snap.type === "MANUAL" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                {t("snapshot.list.manualBadge")}
              </span>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleCompare(snap)}
                  className="p-1 hover:bg-active rounded text-accent"
                  title={t("snapshot.list.compareTitle")}
                >
                    <GitCompare className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleRestore(snap)}
                  className="p-1 hover:bg-active rounded text-muted hover:text-fg"
                  title={t("snapshot.list.restoreTitle")}
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            </div>
          </div>
          <div className="text-[11px] text-muted line-clamp-2">
            {snap.description || t("snapshot.list.autoDescription")}
          </div>
        </div>
      ))}


    </div>
  );
}
