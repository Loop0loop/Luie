import { memo, useCallback, useMemo, useState } from "react";
import { RotateCcw, Calendar } from "lucide-react";
import * as Diff from "diff";
import { api } from "../../services/api";
import { useChapterStore } from "../../stores/chapterStore";
import type { Snapshot } from "../../../../shared/types";
import Editor from "../editor/Editor";

interface SnapshotViewerProps {
  snapshot: Snapshot;
  currentContent?: string;
  onApplySnapshotText?: (content: string) => void | Promise<void>;
}

function htmlToText(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText || div.textContent || "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textToHtml(text: string): string {
  const lines = text.split(/\n/);
  return lines
    .map((line) => (line.length > 0 ? `<p>${escapeHtml(line)}</p>` : "<p><br></p>"))
    .join("");
}

function SnapshotViewer({ snapshot, currentContent, onApplySnapshotText }: SnapshotViewerProps) {
  const { loadAll: reloadChapters } = useChapterStore();
  const [selectedAdditions, setSelectedAdditions] = useState<Set<number>>(new Set());

  const handleRestore = async () => {
    const confirmed = window.confirm("Restore this snapshot? Current content will be overwritten.");
    if (!confirmed) return;

    try {
      const response = await api.snapshot.restore(snapshot.id);
      if (response.success) {
        if (snapshot.projectId) {
          await reloadChapters(snapshot.projectId);
          window.location.reload(); 
        }
      } else {
        api.logger.error("Snapshot restore failed", response.error);
      }
    } catch (error) {
      api.logger.error("Snapshot restore failed", error);
    }
  };

  const formattedDate = snapshot.createdAt 
    ? new Date(snapshot.createdAt).toLocaleString() 
    : "Unknown Date";

  const currentText = useMemo(() => htmlToText(currentContent ?? ""), [currentContent]);
  const snapshotText = useMemo(() => htmlToText(snapshot.content ?? ""), [snapshot.content]);

  const diffParts = useMemo(() => {
    return Diff.diffWordsWithSpace(currentText, snapshotText);
  }, [currentText, snapshotText]);

  const additions = useMemo(() => {
    let index = 0;
    return diffParts
      .filter((part) => part.added)
      .map((part) => ({ id: index++, value: part.value }));
  }, [diffParts]);

  const toggleAddition = useCallback((id: number) => {
    setSelectedAdditions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const buildMergedText = useCallback(
    (selectedIds: Set<number>) => {
      let result = "";
      let addIndex = 0;

      diffParts.forEach((part) => {
        if (part.added) {
          if (selectedIds.has(addIndex)) {
            result += part.value;
          }
          addIndex += 1;
          return;
        }

        if (part.removed) {
          result += part.value;
          return;
        }

        result += part.value;
      });

      return result;
    },
    [diffParts],
  );

  const handleApplySelected = useCallback(
    async (selectedIds: Set<number>) => {
      if (!onApplySnapshotText || selectedIds.size === 0) return;
      const confirmed = window.confirm("선택한 변경 내용을 현재 원고에 적용할까요?");
      if (!confirmed) return;

      const mergedText = buildMergedText(selectedIds);
      const mergedHtml = textToHtml(mergedText);
      await onApplySnapshotText(mergedHtml);
      setSelectedAdditions(new Set());
    },
    [buildMergedText, onApplySnapshotText],
  );

  return (
    <div className="flex flex-col h-full w-full bg-panel border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface text-sm">
        <div className="flex items-center gap-2 text-muted-fg">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">Snapshot: {formattedDate}</span>
        </div>
        <button
          onClick={handleRestore}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restore
        </button>
      </div>

      <div className="border-b border-border bg-panel">
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-fg">
          <span>변경된 내용 (스냅샷에만 존재)</span>
          <button
            onClick={() => void handleApplySelected(new Set(selectedAdditions))}
            className="px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
            disabled={!onApplySnapshotText || selectedAdditions.size === 0}
          >
            선택 적용
          </button>
        </div>
        {additions.length === 0 ? (
          <div className="px-4 pb-3 text-xs text-muted">추가된 내용이 없습니다.</div>
        ) : (
          <div className="max-h-40 overflow-y-auto px-4 pb-3 flex flex-col gap-2">
            {additions.map((addition) => {
              const isSelected = selectedAdditions.has(addition.id);
              return (
                <div
                  key={addition.id}
                  className="flex items-start gap-2 rounded border border-border bg-surface/60 px-2 py-1"
                >
                  <button
                    type="button"
                    className="mt-0.5 text-muted hover:text-fg"
                    onClick={() => toggleAddition(addition.id)}
                    title="선택"
                  >
                    {isSelected ? "▣" : "▢"}
                  </button>
                  <div className="flex-1 text-[11px] text-fg line-clamp-2 whitespace-pre-wrap">
                    {addition.value}
                  </div>
                  <button
                    type="button"
                    className="text-[11px] px-2 py-0.5 rounded bg-surface-hover text-fg hover:bg-active"
                    onClick={() => void handleApplySelected(new Set([addition.id]))}
                    disabled={!onApplySnapshotText}
                  >
                    적용
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Read-Only Editor */}
      <div className="flex-1 min-h-0 bg-yellow-50/5 dark:bg-yellow-900/10"> 
        {/* Subtle background tint to distinguish from main editor */}
        <Editor
          key={snapshot.id} // Re-mount on snapshot change
          initialTitle={snapshot.description || ""}
          initialContent={snapshot.content}
          readOnly={true}
          comparisonContent={currentContent}
          diffMode="snapshot"
        />
      </div>
    </div>
  );
}

export default memo(SnapshotViewer);
