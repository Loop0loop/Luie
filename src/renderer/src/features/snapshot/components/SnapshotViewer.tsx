import { memo, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, Calendar } from "lucide-react";
import * as Diff from "diff";
import { api } from "@shared/api";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useChapterContent } from "@renderer/features/manuscript/hooks/useChapterContent";
import { setChapterContent } from "@renderer/features/manuscript/stores/chapterContentStore";
import type { Snapshot } from '@shared/types';
import Editor from "@renderer/features/editor/components/Editor";
import { useDialog } from "@shared/ui/useDialog";
import { htmlToPlainText } from "@shared/utils/htmlText";

interface SnapshotViewerProps {
  snapshot: Snapshot;
  onApplySnapshotText?: (content: string) => void | Promise<void>;
}
function SnapshotViewer({ snapshot, onApplySnapshotText }: SnapshotViewerProps) {
  const reloadChapters = useChapterStore((state) => state.loadAll);
  // NOTE: 비교 대상인 현재 본문은 이 컴포넌트가 직접 조회한다. 부모가 목록(items)에서 넘겨주면
  // (1) 부모가 본문 변경마다 리렌더되고 (2) 본문이 아직 없을 때 빈 문자열이 넘어와 "전부 삭제됨"
  // 처럼 보이는 잘못된 diff가 나온다. 로딩 중에는 아래에서 diff 자체를 끈다.
  const { content: currentContent, isLoaded: isCurrentContentLoaded } =
    useChapterContent(snapshot.chapterId);
  const [selectedAdditions, setSelectedAdditions] = useState<Set<number>>(new Set());
  const { t } = useTranslation();
  const dialog = useDialog();
  const diffEnabled =
    isCurrentContentLoaded &&
    currentContent.length + (snapshot.content?.length ?? 0) <= 50000;

  const handleRestore = async () => {
    const confirmed = await dialog.confirm({
      title: t("snapshot.viewer.restoreButton"),
      message: t("snapshot.viewer.restoreConfirm"),
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      const response = await api.snapshot.restore(snapshot.id);
      if (response.success) {
        if (snapshot.projectId) {
          await reloadChapters(snapshot.projectId);
        }
        // NOTE: 복원 본문은 이미 손에 있다. reloadChapters가 비운 캐시를 재조회 없이 여기서
        // 채워야 에디터가 게이트를 거치지 않는다(깜빡임 제거 + 언마운트/재마운트 1회 감소).
        // main의 restoreSnapshot이 쓰는 값과 동일한 정규화를 적용한다.
        if (snapshot.chapterId) {
          setChapterContent(
            snapshot.chapterId,
            typeof snapshot.content === "string" ? snapshot.content : "",
          );
        }
        // NOTE: 같은 챕터의 본문이 바뀌므로 Editor key 리비전을 올려 리마운트시킨다.
        useChapterStore.getState().bumpContentRevision();
        dialog.toast(t("snapshot.viewer.restoreSuccess"), "success");
      } else {
        api.logger.error("Snapshot restore failed", response.error);
        dialog.toast(t("snapshot.viewer.restoreFailed"), "error");
      }
    } catch (error) {
      api.logger.error("Snapshot restore failed", error);
      dialog.toast(t("snapshot.viewer.restoreFailed"), "error");
    }
  };

  const formattedDate = snapshot.createdAt 
    ? new Date(snapshot.createdAt).toLocaleString() 
    : t("snapshot.viewer.unknownDate");

  const currentHtml = useMemo(() => currentContent, [currentContent]);
  const snapshotHtml = useMemo(() => snapshot.content ?? "", [snapshot.content]);

  const diffParts = useMemo(() => {
    if (!diffEnabled) return [] as Diff.Change[];
    return Diff.diffWordsWithSpace(currentHtml, snapshotHtml);
  }, [currentHtml, snapshotHtml, diffEnabled]);

  const additions = useMemo(() => {
    let index = 0;
    return diffParts
      .filter((part) => part.added)
      .map((part) => ({
        id: index++,
        value: part.value,
        text: htmlToPlainText(part.value).trim(),
      }));
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

  const buildMergedHtml = useCallback(
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
      const confirmed = await dialog.confirm({
        title: t("snapshot.viewer.applySelected"),
        message: t("snapshot.viewer.applyConfirm"),
      });
      if (!confirmed) return;

      try {
        const mergedHtml = buildMergedHtml(selectedIds);
        await onApplySnapshotText(mergedHtml);
        setSelectedAdditions(new Set());
        dialog.toast(t("snapshot.viewer.applySuccess"), "success");
      } catch (error) {
        api.logger.error("Failed to apply snapshot selection", error);
        dialog.toast(t("snapshot.viewer.applyFailed"), "error");
      }
    },
    [buildMergedHtml, dialog, onApplySnapshotText, t],
  );

  return (
    <div className="research-surface flex h-full w-full flex-col overflow-hidden border-0 outline-hidden">
      <div className="flex items-center justify-between bg-surface/70 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 text-muted-fg">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">{t("snapshot.viewer.header", { date: formattedDate })}</span>
        </div>
        <button
          onClick={handleRestore}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t("snapshot.viewer.restoreButton")}
        </button>
      </div>

      <div className="bg-panel/80">
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-fg">
          <span>{t("snapshot.viewer.changesHeader")}</span>
          <button
            onClick={() => void handleApplySelected(new Set(selectedAdditions))}
            className="px-2 py-1 rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
            disabled={!onApplySnapshotText || selectedAdditions.size === 0}
          >
            {t("snapshot.viewer.applySelected")}
          </button>
        </div>
        {!diffEnabled ? (
          <div className="px-4 pb-3 text-xs text-muted">
            {t("snapshot.viewer.diffSkipped")}
          </div>
        ) : additions.length === 0 ? (
          <div className="px-4 pb-3 text-xs text-muted">{t("snapshot.viewer.noAdditions")}</div>
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
                    title={t("snapshot.viewer.selectTitle")}
                  >
                    {isSelected ? "▣" : "▢"}
                  </button>
                  <div className="flex-1 text-[11px] text-fg line-clamp-2 whitespace-pre-wrap">
                    {addition.text || t("snapshot.viewer.formatOnly")}
                  </div>
                  <button
                    type="button"
                    className="text-[11px] px-2 py-0.5 rounded bg-surface-hover text-fg hover:bg-active"
                    onClick={() => void handleApplySelected(new Set([addition.id]))}
                    disabled={!onApplySnapshotText}
                  >
                    {t("snapshot.viewer.applySingle")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="research-surface flex-1 min-h-0 border-0 outline-hidden">
        <Editor
          key={snapshot.id} // Re-mount on snapshot change
          initialTitle={snapshot.description || ""}
          initialContent={snapshot.content}
          readOnly={true}
          hideToolbar={true}
          hideFooter={true}
          comparisonContent={diffEnabled ? currentContent : undefined}
          diffMode={diffEnabled ? "snapshot" : undefined}
        />
      </div>
    </div>
  );
}

export default memo(SnapshotViewer);
