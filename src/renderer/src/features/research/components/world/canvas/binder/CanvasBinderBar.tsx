import { useTranslation } from "react-i18next";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { Separator } from "@renderer/components/ui/separator";
import { CANVAS_SECTION_KEYS } from "../shared/constants";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { BinderInspector } from "./BinderInspector";
import { BinderRelated } from "./BinderRelated";
import { BinderSuggestions } from "./BinderSuggestions";
import { BinderAgent } from "./BinderAgent";
import { BinderSection } from "./BinderSection";

/**
 * 우측 BinderBar: 선택한 노드/엣지를 어떻게 다룰지를 모은다.
 *
 *   Inspector    : 선택 대상의 상세
 *   Related      : 관련 원고/노드/메모
 *   Suggestions  : Derived 후보 처리
 *   Agent        : Agent 액션
 *
 * 선택이 없으면 캔버스 전체 상태(Scope Overview) 모드로 동작한다.
 */
export function CanvasBinderBar() {
  const { t } = useTranslation();
  const selection = useCanvasUiStore((s) => s.selection);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-l border-border bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 py-3">
          <BinderSection title={t(CANVAS_SECTION_KEYS.inspector)}>
            <BinderInspector selection={selection} />
          </BinderSection>

          <Separator className="my-1" />

          <BinderSection title={t(CANVAS_SECTION_KEYS.related)}>
            <BinderRelated />
          </BinderSection>

          <Separator className="my-1" />

          <BinderSection title={t(CANVAS_SECTION_KEYS.suggestions)}>
            <BinderSuggestions />
          </BinderSection>

          <Separator className="my-1" />

          <BinderSection title={t(CANVAS_SECTION_KEYS.agent)}>
            <BinderAgent selection={selection} />
          </BinderSection>
        </div>
      </ScrollArea>
    </aside>
  );
}
