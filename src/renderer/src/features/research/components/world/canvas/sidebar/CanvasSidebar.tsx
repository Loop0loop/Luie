import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { Separator } from "@renderer/components/ui/separator";
import { ScopeSelector } from "./ScopeSelector";
import { CanvasOutline } from "./CanvasOutline";
import { LayerToggles } from "./LayerToggles";
import { Filters } from "./Filters";

/**
 * 좌측 사이드바: "캔버스를 어떻게 볼지"만 다룬다.
 * 선택한 노드의 상세는 절대 여기 두지 않는다 (그건 BinderBar).
 *
 * 구성:
 *   Scope    : 어디를 볼지
 *   Outline  : 어떤 노드가 있는지 / 빠른 이동 (가변 높이, fill 영역)
 *   Layers   : 어떤 레이어를 보일지
 *   Filters  : 어떤 노드 종류를 보일지
 *
 * Scope/Outline 위쪽 묶음과 Layers/Filters 아래쪽 묶음을 separator로 구분한다.
 * Outline은 길어질 수 있으므로 fill로 두고, Layers/Filters는 항상 하단 고정.
 */
export function CanvasSidebar() {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-background">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-col gap-2 pt-2">
          <ScopeSelector />
        </div>

        <Separator className="my-2" />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CanvasOutline />
        </div>

        <Separator className="my-2" />

        <ScrollArea className="max-h-[40%] shrink-0">
          <div className="flex flex-col gap-2 pb-3">
            <LayerToggles />
            <Separator className="my-1" />
            <Filters />
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
