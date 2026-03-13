import { useCallback } from "react";
import { useReactFlow } from "reactflow";
import { 
  Settings, 
  ZoomIn, 
  RotateCcw, 
  Maximize, 
  ZoomOut, 
  Undo, 
  Redo, 
  HelpCircle 
} from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { Separator } from "@renderer/components/ui/separator";
import { useToast } from "@shared/ui/ToastContext";

export function WorldGraphFloatingToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { showToast } = useToast();

  const handleRefresh = useCallback(() => {
    // Usually fitView or reload graph. We'll simply fit view for now as a "refresh" position
    fitView({ duration: 400, padding: 0.15 });
    showToast("뷰가 초기화되었습니다.", "success");
  }, [fitView, showToast]);

  const handleUndo = useCallback(() => {
    showToast("실행 취소(Undo)는 현재 지원되지 않습니다.", "info");
  }, [showToast]);

  const handleRedo = useCallback(() => {
    showToast("다시 실행(Redo)은 현재 지원되지 않습니다.", "info");
  }, [showToast]);

  const handleHelp = useCallback(() => {
    showToast("도움말: 캔버스를 더블 클릭하여 새 블록을 추가하세요.", "info");
  }, [showToast]);

  const handleSettings = useCallback(() => {
    showToast("설정 패널을 엽니다.", "info");
  }, [showToast]);

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-center gap-1 rounded-xl border border-border/40 bg-panel/95 p-1.5 shadow-xl ring-1 ring-black/5 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-element hover:text-fg"
        onClick={handleSettings}
        title="설정"
      >
        <Settings size={16} />
      </Button>
      
      <Separator orientation="horizontal" className="my-0.5 w-6 bg-border/40" />
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-element hover:text-fg"
        onClick={() => zoomIn({ duration: 200 })}
        title="확대"
      >
        <ZoomIn size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-element hover:text-fg"
        onClick={handleRefresh}
        title="초기화"
      >
        <RotateCcw size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-element hover:text-fg"
        onClick={() => fitView({ duration: 400, padding: 0.15 })}
        title="화면 맞춤"
      >
        <Maximize size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-element hover:text-fg"
        onClick={() => zoomOut({ duration: 200 })}
        title="축소"
      >
        <ZoomOut size={16} />
      </Button>

      <Separator orientation="horizontal" className="my-0.5 w-6 bg-border/40" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-element hover:text-fg"
        onClick={handleUndo}
        title="실행 취소"
      >
        <Undo size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-element hover:text-fg"
        onClick={handleRedo}
        title="다시 실행"
      >
        <Redo size={16} />
      </Button>

      <Separator orientation="horizontal" className="my-0.5 w-6 bg-border/40" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-element hover:text-fg"
        onClick={handleHelp}
        title="도움말"
      >
        <HelpCircle size={16} />
      </Button>
    </div>
  );
}
