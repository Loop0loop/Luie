import {
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type CanvasFlowControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onFitCanvas: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

export function CanvasFlowControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  onFitCanvas,
  onUndo,
  onRedo,
}: CanvasFlowControlsProps) {
  const { t } = useTranslation();
  return (
    <div className="absolute right-6 top-6 z-10 flex flex-col gap-3">
      <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-background/80 shadow-2xl backdrop-blur-xl">
        {[
          {
            icon: Plus,
            title: t("research.graph.canvas.controls.zoomIn"),
            onClick: onZoomIn,
          },
          {
            icon: Minus,
            title: t("research.graph.canvas.controls.zoomOut"),
            onClick: onZoomOut,
          },
          {
            icon: RefreshCw,
            title: t("research.graph.canvas.controls.fitView"),
            onClick: onFitView,
          },
          {
            icon: Maximize2,
            title: t("research.graph.canvas.controls.fitCanvas"),
            onClick: onFitCanvas,
          },
        ].map((control) => (
          <button
            key={control.title}
            type="button"
            className="flex h-10 w-10 items-center justify-center border-b border-white/5 text-muted-foreground transition-colors last:border-0 hover:bg-white/5 hover:text-foreground"
            title={control.title}
            onClick={control.onClick}
          >
            <control.icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-background/80 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center border-b border-white/5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          title={t("research.graph.canvas.controls.undo")}
          onClick={onUndo}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          title={t("research.graph.canvas.controls.redo")}
          onClick={onRedo}
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
