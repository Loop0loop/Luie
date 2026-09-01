import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { GlobalDragContext } from "@shared/ui/GlobalDragContext";
import { layoutFallback } from "@renderer/features/workspace/components/layout/rootShell";
import type { LayoutChoice } from "../../types/wizard";
import { PreviewBoundary } from "../PreviewBoundary";
import { LayoutLivePreview } from "../preview/LayoutLivePreview";
import { LayoutThumb } from "../preview/LayoutThumb";

interface LayoutStepProps {
  uiMode: LayoutChoice;
  onUiModeChange: (uiMode: LayoutChoice) => void;
  onPrevious: () => void;
  onFinish: () => void;
}

const LAYOUT_OPTIONS = [
  ["default", "layoutDefault"],
  ["docs", "layoutDocs"],
  ["editor", "layoutEditor"],
  ["scrivener", "layoutScrivener"],
] as const;

export function LayoutStep({
  uiMode,
  onUiModeChange,
  onPrevious,
  onFinish,
}: LayoutStepProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50">
      <div
        key={uiMode}
        className="absolute inset-0 animate-in fade-in duration-300"
      >
        <PreviewBoundary
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-app p-6">
              <LayoutThumb id={uiMode} className="h-full max-w-3xl" />
            </div>
          }
        >
          <GlobalDragContext>
            <Suspense fallback={layoutFallback}>
              <LayoutLivePreview uiMode={uiMode} />
            </Suspense>
          </GlobalDragContext>
        </PreviewBoundary>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-6">
        {/* 얇은 바이브런스 글래스(HIG materials): 패널 톤을 60%만 남기고 강한
            블러로 가독성을 보완해 아래 실제 레이아웃이 비쳐 보이게 한다. */}
        <div className="pointer-events-auto flex items-end gap-2 rounded-panel border border-border/60 bg-panel/60 p-2 shadow-panel backdrop-blur-2xl">
          <span className="mb-1.5 self-center pr-1 text-sm font-semibold text-fg">
            {t("startupWizard.onboarding.layoutTitle")}
          </span>
          {LAYOUT_OPTIONS.map(([id, labelKey]) => (
            <button
              key={id}
              type="button"
              aria-pressed={uiMode === id}
              onClick={() => onUiModeChange(id)}
              className={`flex w-[108px] flex-col gap-1 rounded-control border p-1.5 text-left transition-colors ${
                uiMode === id
                  ? "border-accent ring-1 ring-accent"
                  : "border-border hover:border-border-active"
              }`}
            >
              <LayoutThumb id={id} className="h-8" />
              <span className="truncate text-[10px] font-medium">
                {t(`startupWizard.onboarding.${labelKey}`)}
              </span>
            </button>
          ))}
          <span aria-hidden className="mx-1 mb-1 h-9 w-px bg-border/70" />
          <button
            type="button"
            onClick={onPrevious}
            className="mb-0.5 rounded-control px-4 py-1.5 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            {t("startupWizard.onboarding.previous")}
          </button>
          <button
            type="button"
            onClick={onFinish}
            className="mb-0.5 rounded-control bg-accent px-5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-bg-hover"
          >
            {t("startupWizard.onboarding.finish")}
          </button>
        </div>
      </div>
    </div>
  );
}
