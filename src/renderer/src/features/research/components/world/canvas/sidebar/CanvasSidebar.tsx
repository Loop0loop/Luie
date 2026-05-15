import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { ScopeSelector } from "./ScopeSelector";
import { DisplayLayers } from "./DisplayLayers";
import { Filters } from "./Filters";

/**
 * 좌측 사이드바 — 워크스페이스(MainLayout/ScrivenerLayout) 사이드바 톤과
 * 동일한 결로 통일.
 *
 * 구성 (위에서 아래로 사용 빈도 순):
 *   Scope        : 어디를 볼지 — 항상 노출, 컴팩트한 pill 그룹
 *   표시 (Display): 매일 쓰는 핵심 레이어 (Canonical, Derived, Timeline)
 *   고급          : 관계 강도/충돌/복선 — 기본 접힘
 *   필터          : 노드 종류 토글 — 기본 접힘 (기본값으로 모두 켜짐)
 *
 * 아웃라인은 캔버스 사이드바에서 제거. 노드 추가는 toolbar로,
 * 노드 탐색/이동은 캔버스 자체에서 한다. 캔버스 안에서 다른 패널을
 * 흉내내지 않는 게 흐름을 끊지 않는 핵심.
 */
export function CanvasSidebar() {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-sidebar text-fg">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col">
          <ScopeSelector />
          <DisplayLayers />
          <Filters />
        </div>
      </ScrollArea>
    </aside>
  );
}
