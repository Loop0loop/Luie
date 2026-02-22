import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import * as Diff from "diff";
import { ArrowRight } from "lucide-react";
import { Modal } from "@shared/ui/Modal";
import { cn } from '@shared/types/utils';

interface SnapshotDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalContent: string;
  snapshotContent: string;
  snapshotDate: Date;
}

export function SnapshotDiffModal({
  isOpen,
  onClose,
  originalContent,
  snapshotContent,
  snapshotDate,
}: SnapshotDiffModalProps) {
  const { t } = useTranslation();
  const diffs = useMemo(() => {
    return Diff.diffChars(snapshotContent, originalContent);
  }, [originalContent, snapshotContent]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("snapshot.diff.title")}
      width="800px" 
    >
      <div className="flex flex-col h-[70vh]">
        <div className="flex items-center justify-between px-4 py-2 bg-panel border-b border-border shrink-0">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-muted font-semibold">{t("snapshot.diff.snapshotPast")}</span>
              <span className="text-xs text-muted/70">
                {snapshotDate.toLocaleString()}
              </span>
            </div>
            <ArrowRight className="text-muted icon-sm" />
            <div className="flex flex-col">
              <span className="text-fg font-semibold">{t("snapshot.diff.currentVersion")}</span>
              <span className="text-xs text-muted/70">{t("snapshot.diff.editingNow")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded-sm"></span>
              {t("snapshot.diff.deleted")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500/20 border border-green-500/50 rounded-sm"></span>
              {t("snapshot.diff.added")}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-app font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {diffs.map((part, index) => {
            const color = part.added
              ? "bg-green-500/20 text-green-700 dark:text-green-300"
              : part.removed
              ? "bg-red-500/20 text-red-700 dark:text-red-300 decoration-slice line-through opacity-70"
              : "text-fg";
            
            return (
              <span key={index} className={cn(color, "rounded-sm px-0.5")}>
                {part.value}
              </span>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-border bg-panel shrink-0 flex justify-end gap-2">
            <button 
                onClick={onClose}
                className="px-4 py-2 rounded bg-element hover:bg-element-hover border border-border text-fg transition-colors"
            >
              {t("snapshot.diff.close")}
            </button>
        </div>
      </div>
    </Modal>
  );
}
