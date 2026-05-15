import { useReactFlow } from "reactflow";
import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { cn } from "@renderer/lib/utils";

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ControlButton({ icon, label, onClick }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors",
        "text-muted hover:bg-surface-hover hover:text-fg",
        "active:scale-95",
      )}
    >
      {icon}
    </button>
  );
}

/**
 * 캔버스 줌/리셋 컨트롤 — 우측 하단 floating bar.
 */
export function CanvasControls() {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow();

  const handleReset = () => {
    setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
  };

  return (
    <div
      className={cn(
        "absolute bottom-3 right-3 z-10",
        "flex items-center gap-0.5 rounded-lg border border-border",
        "bg-panel/85 px-1 py-0.5 shadow-sm backdrop-blur-sm",
      )}
    >
      <ControlButton
        icon={<ZoomIn className="size-3.5" />}
        label={t("canvas.toolbar.fitView")}
        onClick={() => zoomIn({ duration: 200 })}
      />
      <ControlButton
        icon={<ZoomOut className="size-3.5" />}
        label={t("canvas.toolbar.fitView")}
        onClick={() => zoomOut({ duration: 200 })}
      />
      <div className="mx-0.5 h-4 w-px bg-border/60" />
      <ControlButton
        icon={<Maximize2 className="size-3.5" />}
        label={t("canvas.toolbar.fitView")}
        onClick={() => fitView({ duration: 300, padding: 0.2 })}
      />
      <ControlButton
        icon={<RotateCcw className="size-3.5" />}
        label={t("canvas.toolbar.fitView")}
        onClick={handleReset}
      />
    </div>
  );
}
