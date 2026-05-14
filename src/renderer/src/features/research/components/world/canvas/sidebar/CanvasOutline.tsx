import { useTranslation } from "react-i18next";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { CANVAS_SECTION_KEYS } from "../shared/constants";
import { SidebarSection } from "./SidebarSection";

/**
 * Outline: 현재 Scope 안에 들어 있는 노드를 카테고리별로 트리 표시.
 * 클릭하면 캔버스가 해당 노드로 포커스 이동한다.
 *
 * 다음 단계에서 worldBuildingStore의 graphNodes를 받아 채운다.
 */
export function CanvasOutline() {
  const { t } = useTranslation();

  return (
    <SidebarSection title={t(CANVAS_SECTION_KEYS.outline)} fill>
      <ScrollArea className="min-h-0 flex-1">
        <p className="px-1 py-1 text-[12px] text-muted-foreground">
          {t("canvas.sidebar.outline.empty")}
        </p>
      </ScrollArea>
    </SidebarSection>
  );
}
