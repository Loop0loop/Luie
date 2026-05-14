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
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        "active:scale-95",
      )}
    >
      {icon}
    </button>
  );
}

/**
 * Obsidian 스타일 캔버스 컨트롤.
 *
 * react-flow 기본 Controls를 쓰지 않고, 프로젝트 디자인 시스템에 맞춘
 * 커스텀 컨트롤 바를 하단 우측에 배치한다.
 *
 * 스타일:
 *   - 반투명 배경 + border + backdrop-blur
 *   - 작은 아이콘 버튼 (7x7)
 *   - hover 시 muted 배경
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
        "flex items-center gap-0.5 rounded-lg border border-border/60",
        "bg-background/80 px-1 py-0.5 shadow-sm backdrop-blur-sm",
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
