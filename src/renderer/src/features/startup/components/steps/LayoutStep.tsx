import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { GlobalDragContext } from "@shared/ui/GlobalDragContext";
import { layoutFallback } from "@renderer/features/workspace/components/layout/rootShell";
import type { LayoutChoice } from "../../types/wizard";
import { PreviewBoundary } from "../PreviewBoundary";
import { WizardFloatingDock } from "../WizardFloatingDock";
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

      <WizardFloatingDock
        title={t("startupWizard.onboarding.layoutTitle")}
        onPrevious={onPrevious}
        previousLabel={t("startupWizard.onboarding.previous")}
        onNext={onFinish}
        nextLabel={t("startupWizard.onboarding.finish")}
      >
        <div className="flex gap-2" role="radiogroup">
          {LAYOUT_OPTIONS.map(([id, labelKey]) => (
            <button
              key={id}
              type="button"
              aria-pressed={uiMode === id}
              onClick={() => onUiModeChange(id)}
              className={`flex w-[112px] flex-col gap-1.5 rounded-control border p-2 text-left transition-all duration-150 ${
                uiMode === id
                  ? "border-accent ring-2 ring-accent/30 bg-surface/60 shadow-xs scale-[1.02]"
                  : "border-border/70 bg-element/20 hover:border-border-active hover:bg-surface/40"
              }`}
            >
              <LayoutThumb id={id} className="h-8.5 w-full" />
              <span className="truncate text-xs font-medium">
                {t(`startupWizard.onboarding.${labelKey}`)}
              </span>
            </button>
          ))}
        </div>
      </WizardFloatingDock>
    </div>
  );
}
