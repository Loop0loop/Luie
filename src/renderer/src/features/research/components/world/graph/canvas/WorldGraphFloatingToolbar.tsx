import { useCallback } from "react";
import { useReactFlow } from "reactflow";
import { 
  Settings, 
  ZoomIn, 
  RotateCcw, 
  Maximize, 
  ZoomOut,
  LayoutGrid,
  HelpCircle 
} from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { Separator } from "@renderer/components/ui/separator";
import { useToast } from "@shared/ui/ToastContext";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";

export function WorldGraphFloatingToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { showToast } = useToast();
  const triggerLayout = useWorldGraphUiStore((s) => s.triggerLayout);
  const toggleSidebar = useWorldGraphUiStore((s) => s.toggleSidebar);

  const handleRefresh = useCallback(() => {
    fitView({ duration: 400, padding: 0.15 });
    showToast("뷰가 중앙으로 정렬되었습니다.", "success");
  }, [fitView, showToast]);
  
  const handleAutoLayout = useCallback(() => {
    triggerLayout("auto");
    showToast("그래프를 자동 정렬했습니다.", "success");
  }, [triggerLayout, showToast]);

  const handleHelp = useCallback(() => {
    showToast("캔버스를 우클릭하여 커스텀 블록을 만들고, 더블 클릭으로 이름을 변경하세요!", "info");
  }, [showToast]);

  const handleSettings = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-center gap-1 rounded-xl border border-border/40 bg-panel/95 p-1.5 shadow-xl ring-1 ring-black/5 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-element hover:text-fg"
        onClick={handleSettings}
        title="사이드바 토글"
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
        onClick={handleAutoLayout}
        title="자동 정렬"
      >
        <LayoutGrid size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:bg-element hover:text-fg"
        onClick={handleRefresh}
        title="중앙 맞춤"
      >
        <RotateCcw size={16} />
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
