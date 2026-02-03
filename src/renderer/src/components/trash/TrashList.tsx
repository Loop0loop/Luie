import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Trash2, Clock } from "lucide-react";
import { api } from "../../services/api";
import { useChapterStore } from "../../stores/chapterStore";
import type { Chapter } from "../../../../shared/types";

interface TrashListProps {
  projectId: string;
  refreshKey?: number;
  onRestoreChapter?: (id: string) => void;
}

type TrashItem = Chapter & { deletedAt?: string | Date | null };

export function TrashList({ projectId, refreshKey, onRestoreChapter }: TrashListProps) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgingId, setPurgingId] = useState<string | null>(null);

  const { loadAll: reloadChapters } = useChapterStore();

  const loadTrash = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const response = await api.chapter.getDeleted(projectId);
      if (response.success && response.data) {
        setItems(response.data as TrashItem[]);
      } else {
        setItems([]);
      }
    } catch (error) {
      api.logger.error("Failed to load trash", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash, refreshKey]);

  const handleRestore = useCallback(
    async (id: string) => {
      if (restoringId || purgingId) return;
      const confirmed = window.confirm("휴지통에서 복구할까요?");
      if (!confirmed) return;

      setRestoringId(id);
      try {
        const response = await api.chapter.restore(id);
        if (response.success) {
          await reloadChapters(projectId);
          onRestoreChapter?.(id);
          await loadTrash();
        }
      } catch (error) {
        api.logger.error("Failed to restore chapter", error);
      } finally {
        setRestoringId(null);
      }
    },
    [loadTrash, onRestoreChapter, projectId, purgingId, restoringId, reloadChapters],
  );

  const handlePurge = useCallback(
    async (id: string) => {
      if (restoringId || purgingId) return;
      const confirmed = window.confirm("영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.");
      if (!confirmed) return;

      setPurgingId(id);
      try {
        const response = await api.chapter.purge(id);
        if (response.success) {
          await loadTrash();
        }
      } catch (error) {
        api.logger.error("Failed to purge chapter", error);
      } finally {
        setPurgingId(null);
      }
    },
    [loadTrash, purgingId, restoringId],
  );

  const emptyState = useMemo(() => {
    return (
      <div className="p-4 text-xs text-muted flex flex-col items-center justify-center h-full opacity-60">
        <Clock className="mb-2 w-8 h-8 opacity-20" />
        휴지통이 비어 있습니다.
      </div>
    );
  }, []);

  if (loading) {
    return <div className="p-4 text-xs text-muted">Loading...</div>;
  }

  if (items.length === 0) {
    return emptyState;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {items.map((item) => {
        const deletedAt = item.deletedAt ? new Date(item.deletedAt) : null;
        const deletedLabel = deletedAt && !Number.isNaN(deletedAt.getTime())
          ? deletedAt.toLocaleString()
          : "";

        return (
          <div
            key={item.id}
            className="p-3 border-b border-border hover:bg-surface-hover transition-colors group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-fg truncate">
                {item.title}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleRestore(item.id)}
                  className="p-1 hover:bg-active rounded text-muted hover:text-fg"
                  title="복구"
                  disabled={restoringId === item.id || purgingId === item.id}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePurge(item.id)}
                  className="p-1 hover:bg-active rounded text-red-400 hover:text-red-300"
                  title="영구 삭제"
                  disabled={restoringId === item.id || purgingId === item.id}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="text-[11px] text-muted">
              {deletedLabel || "삭제됨"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
