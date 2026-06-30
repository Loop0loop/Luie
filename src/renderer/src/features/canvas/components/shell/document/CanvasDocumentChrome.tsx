import type { ReactNode } from "react";
import { GitBranch, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate, getString, getStringArray, getTagValues } from "./canvasDocumentModel";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";

export function DocumentShell({
  children,
  kindLabel,
  title,
}: {
  children: ReactNode;
  kindLabel: string;
  title: string;
}) {
  const { t } = useTranslation();
  const isSidebarOpen = useUIStore((state) => state.regions.leftSidebar.open);
  const isContextOpen = useUIStore((state) => state.regions.rightPanel.open);
  const toggleLeftSidebar = useUIStore((state) => state.toggleLeftSidebar);
  const setRegionOpen = useUIStore((state) => state.setRegionOpen);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-app text-fg" data-testid="canvas-document-view">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-panel px-3">
        <div className="flex min-w-0 items-center gap-2.5 text-xs">
          {/* 좌측 사이드바 접기/펴기 버튼 */}
          <button
            type="button"
            onClick={toggleLeftSidebar}
            className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-surface-hover hover:text-fg transition-colors cursor-pointer shrink-0"
            title={isSidebarOpen ? t("mainLayout.tooltip.sidebarCollapse") : t("mainLayout.tooltip.sidebarExpand")}
            aria-label={isSidebarOpen ? t("mainLayout.tooltip.sidebarCollapse") : t("mainLayout.tooltip.sidebarExpand")}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>

          <span className="text-muted ml-0.5">{t("canvas.activity.canvas")}</span>
          <span className="text-subtle">/</span>
          <span className="text-muted">{kindLabel}</span>
          <span className="text-subtle">/</span>
          <span className="truncate font-medium text-fg">{title}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* 우측 바인더 접기/펴기 버튼 */}
          <button
            type="button"
            onClick={() => setRegionOpen("rightPanel", !isContextOpen)}
            className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-surface-hover hover:text-fg transition-colors cursor-pointer shrink-0"
            title={isContextOpen ? t("mainLayout.tooltip.contextCollapse") : t("mainLayout.tooltip.contextExpand")}
            aria-label={isContextOpen ? t("mainLayout.tooltip.contextCollapse") : t("mainLayout.tooltip.contextExpand")}
          >
            {isContextOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
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
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-1.5 font-medium text-fg">
        <GitBranch className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
        {t("canvas.document.canvasResource")}
      </span>
      <span className="text-subtle">/</span>
      <span>{kindLabel}</span>
      {firstAppearance ? (
        <>
          <span className="text-subtle">/</span>
          <span>
            {t("canvas.document.firstAppearance")} {firstAppearance}
          </span>
        </>
      ) : null}
      {updatedAt ? (
        <>
          <span className="text-subtle">/</span>
          <span>
            {t("canvas.document.updatedAt")} {formatDate(updatedAt)}
          </span>
        </>
      ) : null}
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
  const { t } = useTranslation();
  const summary = getString(attrs.tagline) || description || "";
  const chips = [
    ...getStringArray(attrs.roles),
    ...getStringArray(attrs.keywords),
    ...getTagValues(attrs),
  ].slice(0, 8);

  if (!summary && !firstAppearance && chips.length === 0) {
    return (
      <div className="mt-7 border-y border-border py-4 text-sm text-subtle">
        {t("canvas.document.emptySynced")}
      </div>
    );
  }

  return (
    <div className="mt-7 flex flex-col gap-3 border-y border-border py-4 text-sm">
      {summary ? <p className="m-0 leading-7 text-fg">{summary}</p> : null}
      <div className="flex flex-wrap gap-2 text-xs">
        {firstAppearance ? (
          <MetaChip label={`${t("canvas.document.firstAppearance")} ${firstAppearance}`} />
        ) : null}
        {chips.map((chip) => (
          <MetaChip key={chip} label={chip} />
        ))}
      </div>
    </div>
  );
}

export function PropertyLine({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-start gap-6 text-canvas-doc-body leading-7">
      <div className="flex w-canvas-doc-label shrink-0 items-center gap-4 text-muted">
        <span className="text-subtle" aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-fg">{children}</div>
    </div>
  );
}

export function TagList({ value }: { value: string[] }) {
  const { t } = useTranslation();
  const tags = value.filter(Boolean);
  if (tags.length === 0) return <span className="text-subtle">{t("canvas.document.noTags")}</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <MetaChip key={tag} label={tag} />
      ))}
    </div>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-control border border-border bg-surface px-2.5 py-1 text-muted">{label}</span>
  );
}
