import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { GitBranch, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDate, getString, getStringArray, getTagValues } from "./canvasDocumentModel";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useWindowsWindowControlsStore } from "@renderer/app/shell/windowsWindowControlsStore";

const isMacOS = navigator.userAgent.toLowerCase().includes("mac");
const isWindows = navigator.userAgent.toLowerCase().includes("win");
/**
 * MainLayout 좌측 토글 버튼이 사이드바 닫힐 때 `left-[92px]`로 이동한다.
 * 이 헤더도 같은 위치에 맞추기 위해 px-3(12px)를 뺀 80px을 marginLeft로 준다.
 */
const TRAFFIC_LIGHT_CONTENT_OFFSET_PX = 80;

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
  const setPlacement = useWindowsWindowControlsStore(
    (state) => state.setPlacement,
  );
  const resetPlacement = useWindowsWindowControlsStore(
    (state) => state.resetPlacement,
  );

  // NOTE: Windows 인앱 창 버튼을 이 헤더(h-12)의 세로 중앙에 맞춘다. 이 크롬이
  // unmount되면 배치를 되돌려 다른 화면에 topInset이 새지 않게 한다.
  useEffect(() => {
    if (!isWindows) return;
    setPlacement({ topInset: 8 });
    return () => {
      resetPlacement();
    };
  }, [setPlacement, resetPlacement]);

  // NOTE: macOS hiddenInset 타이틀바에서 사이드바가 닫히면 콘텐츠 영역이
  // 창 왼쪽 끝까지 확장되어 트래픽 라이트 버튼(16,16 / 너비 ~52px)과 겹친다.
  // 사이드바 슬라이드 transition(200ms)과 동기화된 margin-left로 보간한다.
  const reserveTrafficLightsSpace = isMacOS && !isSidebarOpen;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-app text-fg" data-testid="canvas-document-view">
      {/* NOTE: MainLayout content panel의 drag region overlay(z-30, h-11)가 헤더를 덮어
          버튼이 동작하지 않는다. z-30 이상 + no-drag로 버튼을 보호한다. */}
      <div
        className="relative z-30 flex h-12 shrink-0 items-center justify-between border-b border-border bg-panel px-3"
        style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
      >
        <div
          className="flex min-w-0 items-center gap-2.5 text-xs transition-[margin-left] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{ marginLeft: reserveTrafficLightsSpace ? TRAFFIC_LIGHT_CONTENT_OFFSET_PX : undefined }}
        >
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

        <div
          className={`flex items-center gap-1 shrink-0 ${
            // NOTE: Windows는 이 헤더의 우측 끝(버튼 3개 폭 132px)을 인앱 창 버튼이 덮는다.
            // 인스펙터 토글을 버튼 왼쪽으로 밀어 겹침을 피한다.
            isWindows ? "mr-32" : ""
          }`}
        >
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
