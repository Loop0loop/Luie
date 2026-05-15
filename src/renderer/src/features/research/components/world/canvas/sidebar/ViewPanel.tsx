import { useTranslation } from "react-i18next";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { CANVAS_SECTION_KEYS } from "../shared/constants";
import { ScopeSelector } from "./ScopeSelector";
import { DisplayLayers } from "./DisplayLayers";
import { Filters } from "./Filters";
import { SidePanelHeader } from "./SidePanelHeader";

/**
 * View Activity의 SidePanel 본문.
 *
 * "캔버스를 어떻게 볼지"만 모아둔 컨트롤러 패널 — 노드 자체는
 * 다루지 않는다. Scope → Display(핵심 레이어 + 고급) → Filters
 * 순서로 사용 빈도 높은 것부터.
 */
export function ViewPanel() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidePanelHeader title={t(CANVAS_SECTION_KEYS.view)} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col">
          <ScopeSelector />
          <DisplayLayers />
          <Filters />
        </div>
      </ScrollArea>
    </div>
  );
}
