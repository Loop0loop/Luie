import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { FileText, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { BufferedInput } from "@shared/ui/BufferedInput";
import { cn } from "@shared/types/utils";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import type { CanvasEntityPreview as CanvasEntityPreviewState } from "../../types";
import { useCanvasViewStore } from "../../stores";

const WikiDetailView = lazy(
  () => import("@renderer/features/research/components/wiki/WikiDetailView"),
);
const EventDetailView = lazy(
  () => import("@renderer/features/research/components/event/EventDetailView"),
);
const FactionDetailView = lazy(
  () => import("@renderer/features/research/components/faction/FactionDetailView"),
);

const previewFallback = (
  <div className="flex h-full items-center justify-center text-xs text-muted" />
);

interface CanvasEntityPreviewProps {
  preview: CanvasEntityPreviewState;
}

export default function CanvasEntityPreview({ preview }: CanvasEntityPreviewProps) {
  const { t } = useTranslation();
  const clearEntityPreview = useCanvasViewStore((state) => state.clearEntityPreview);
  const title = getPreviewTitle(preview.kind, t);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-app text-fg" data-testid="canvas-entity-preview">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/30 bg-sidebar px-3">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="text-muted">{t("canvas.activity.canvas")}</span>
          <span className="text-subtle">/</span>
          <span className="truncate font-medium text-fg">{title}</span>
        </div>
        <button
          type="button"
          onClick={clearEntityPreview}
          className="flex h-8 w-8 items-center justify-center rounded-control border-none bg-transparent text-muted transition-colors hover:bg-active hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          title={t("canvas.toolbar.backToCanvas", "캔버스로 돌아가기")}
          aria-label={t("canvas.toolbar.backToCanvas", "캔버스로 돌아가기")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <Suspense fallback={previewFallback}>
          {preview.kind === "character" && <WikiDetailView characterId={preview.id} />}
          {preview.kind === "event" && <EventDetailView eventId={preview.id} />}
          {preview.kind === "faction" && <FactionDetailView factionId={preview.id} />}
          {preview.kind === "memo" && <MemoPreview memoId={preview.id} />}
        </Suspense>
      </div>
    </div>
  );
}

function getPreviewTitle(
  kind: CanvasEntityPreviewState["kind"],
  t: TFunction,
) {
  switch (kind) {
    case "character":
      return t("research.title.characters", "Characters");
    case "event":
      return t("research.title.events", "Events");
    case "faction":
      return t("research.title.factions", "Factions");
    case "memo":
      return t("research.title.scrap", "Scrap");
  }
}

function MemoPreview({ memoId }: { memoId: string }) {
  const { t } = useTranslation();
  const note = useMemoStore((state) =>
    state.notes.find((candidate) => candidate.id === memoId) ?? null,
  );
  const updateNote = useMemoStore((state) => state.updateNote);
  const [content, setContent] = useState(note?.content ?? "");

  useEffect(() => {
    setContent(note?.content ?? "");
  }, [note?.id, note?.content]);

  const tags = useMemo(() => note?.tags.join(", ") ?? "", [note?.tags]);

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        {t("canvas.preview.memoNotFound", "메모를 찾을 수 없습니다.")}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-panel">
      <article className="mx-auto flex w-full max-w-[760px] flex-col gap-7 px-8 py-8">
        <div className="flex flex-col gap-3 border-b border-border/40 pb-5">
          <div className="flex items-center gap-2 text-xs text-muted">
            <FileText className="h-4 w-4 text-accent" />
            <span>{t("research.title.scrap", "Scrap")}</span>
          </div>
          <BufferedInput
            className="w-full rounded-control border-none bg-transparent p-0 text-[26px] font-semibold leading-tight text-fg outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring/30"
            value={note.title}
            placeholder={t("project.defaults.noteTitle")}
            onSave={(title) => updateNote(note.id, { title })}
          />
          <div className="flex items-start gap-3 rounded-control px-1 py-1.5 text-sm">
            <span className="w-20 shrink-0 text-xs text-muted">{t("memo.tags", "Tags")}</span>
            <span className={cn("min-w-0 flex-1 text-fg", !tags && "text-subtle")}>
              {tags || t("canvas.preview.noTags", "태그 없음")}
            </span>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onBlur={() => updateNote(note.id, { content })}
          className="min-h-[420px] w-full resize-none rounded-control border-none bg-transparent text-[15px] leading-7 text-fg outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ring/30"
          placeholder={t("canvas.preview.memoPlaceholder", "메모를 작성하세요.")}
        />
      </article>
    </div>
  );
}
