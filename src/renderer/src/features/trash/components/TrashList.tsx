import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Trash2, Clock } from "lucide-react";
import { DraggableItem } from "@shared/ui/DraggableItem";
import { api } from "@shared/api";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import type { Chapter } from '@shared/types';
import { useTranslation } from "react-i18next";
import { useDialog } from "@shared/ui/DialogProvider";

interface TrashListProps {
  projectId: string;
  refreshKey?: number;
  onRestoreChapter?: (id: string) => void;
}

type TrashItem = Chapter & { deletedAt?: string | Date | null };

export function TrashList({ projectId, refreshKey, onRestoreChapter }: TrashListProps) {
  const { t } = useTranslation();
  const dialog = useDialog();
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
      const confirmed = await dialog.confirm({
        title: t("trash.restore"),
        message: t("trash.confirmRestore"),
        isDestructive: true,
      });
      if (!confirmed) return;

      setRestoringId(id);
      try {
        const response = await api.chapter.restore(id);
        if (response.success) {
          await reloadChapters(projectId);
          onRestoreChapter?.(id);
          await loadTrash();
          dialog.toast(t("trash.restoreSuccess"), "success");
        } else {
          dialog.toast(t("trash.restoreFailed"), "error");
        }
      } catch (error) {
        api.logger.error("Failed to restore chapter", error);
        dialog.toast(t("trash.restoreFailed"), "error");
      } finally {
        setRestoringId(null);
      }
    },
    [
      dialog,
      loadTrash,
      onRestoreChapter,
      projectId,
      purgingId,
      restoringId,
      reloadChapters,
      t,
    ],
  );

  const handlePurge = useCallback(
    async (id: string) => {
      if (restoringId || purgingId) return;
      const confirmed = await dialog.confirm({
        title: t("trash.purge"),
        message: t("trash.confirmPurge"),
        isDestructive: true,
      });
      if (!confirmed) return;

      setPurgingId(id);
      try {
        const response = await api.chapter.purge(id);
        if (response.success) {
          await loadTrash();
          dialog.toast(t("trash.purgeSuccess"), "success");
        } else {
          dialog.toast(t("trash.purgeFailed"), "error");
        }
      } catch (error) {
        api.logger.error("Failed to purge chapter", error);
        dialog.toast(t("trash.purgeFailed"), "error");
      } finally {
        setPurgingId(null);
      }
    },
    [dialog, loadTrash, purgingId, restoringId, t],
  );

  const emptyState = useMemo(() => {
    return (
      <div className="p-4 text-xs text-muted flex flex-col items-center justify-center h-full opacity-60">
        <Clock className="mb-2 w-8 h-8 opacity-20" />
        {t("trash.empty")}
      </div>
    );
  }, [t]);

  if (loading) {
    return <div className="p-4 text-xs text-muted">{t("trash.loading")}</div>;
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
          <DraggableItem
            key={item.id}
            id={`trash-${item.id}`}
            data={{ type: "trash", id: item.id, title: item.title }}
          >
            <div
              className="p-3 border-b border-border hover:bg-surface-hover transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-fg truncate">
                  {item.title}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }}
                    className="p-1 hover:bg-active rounded text-muted hover:text-fg"
                    title={t("trash.restore")}
                    disabled={restoringId === item.id || purgingId === item.id}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePurge(item.id); }}
                    className="p-1 hover:bg-active rounded text-red-400 hover:text-red-300"
                    title={t("trash.purge")}
                    disabled={restoringId === item.id || purgingId === item.id}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-muted">
                {deletedLabel || t("trash.deleted")}
              </div>
            </div>
          </DraggableItem>
        );
      })}
    </div>
  );
}
