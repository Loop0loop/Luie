import type { ReactNode } from "react";
import { GitBranch, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate, getString, getStringArray, getTagValues } from "./canvasDocumentModel";

export function DocumentShell({
  children,
  kindLabel,
  title,
  onClose,
}: {
  children: ReactNode;
  kindLabel: string;
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-app text-fg" data-testid="canvas-document-view">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/30 bg-sidebar px-3">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="text-muted">{t("canvas.activity.canvas")}</span>
          <span className="text-subtle">/</span>
          <span className="text-muted">{kindLabel}</span>
          <span className="text-subtle">/</span>
          <span className="truncate font-medium text-fg">{title}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-control border-none bg-transparent text-muted transition-colors hover:bg-active hover:text-fg focus-visible:bg-active focus-visible:outline-none"
          title={t("canvas.toolbar.backToCanvas", "캔버스로 돌아가기")}
          aria-label={t("canvas.toolbar.backToCanvas", "캔버스로 돌아가기")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-panel">{children}</div>
    </div>
  );
}

export function CanvasContextBar({
  firstAppearance,
  kindLabel,
  updatedAt,
}: {
  firstAppearance?: string | null;
  kindLabel: string;
  updatedAt?: string | Date | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-1.5 font-medium text-fg">
        <GitBranch className="h-3.5 w-3.5 text-subtle" />
        캔버스 자료
      </span>
      <span className="text-subtle">/</span>
      <span>{kindLabel}</span>
      {firstAppearance ? <><span className="text-subtle">/</span><span>첫 등장 {firstAppearance}</span></> : null}
      {updatedAt ? <><span className="text-subtle">/</span><span>수정 {formatDate(updatedAt)}</span></> : null}
    </div>
  );
}

export function ReferenceStrip({
  attrs,
  description,
  firstAppearance,
}: {
  attrs: Record<string, unknown>;
  description?: string | null;
  firstAppearance?: string | null;
}) {
  const summary = getString(attrs.tagline) || description || "";
  const chips = [...getStringArray(attrs.roles), ...getStringArray(attrs.keywords), ...getTagValues(attrs)].slice(0, 8);

  if (!summary && !firstAppearance && chips.length === 0) {
    return <div className="mt-7 border-y border-border/50 py-4 text-sm text-subtle">캔버스와 동기화된 자료입니다. 필요한 집필 메모를 아래에 바로 정리하세요.</div>;
  }

  return (
    <div className="mt-7 flex flex-col gap-3 border-y border-border/50 py-4 text-sm">
      {summary ? <p className="m-0 leading-7 text-fg">{summary}</p> : null}
      <div className="flex flex-wrap gap-2 text-xs">
        {firstAppearance ? <MetaChip label={`첫 등장 ${firstAppearance}`} /> : null}
        {chips.map((chip) => <MetaChip key={chip} label={chip} />)}
      </div>
    </div>
  );
}

export function PropertyLine({ children, icon, label }: { children: ReactNode; icon: ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-6 text-[15px] leading-7">
      <div className="flex w-[190px] shrink-0 items-center gap-4 text-muted">
        <span className="text-subtle">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-fg">{children}</div>
    </div>
  );
}

export function TagList({ value }: { value: string[] }) {
  const tags = value.filter(Boolean);
  if (tags.length === 0) return <span className="text-subtle">태그 없음</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => <MetaChip key={tag} label={tag} />)}
    </div>
  );
}

function MetaChip({ label }: { label: string }) {
  return <span className="rounded-control border border-border/50 bg-surface px-2.5 py-1 text-muted">{label}</span>;
}
