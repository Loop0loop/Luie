import { useTranslation } from "react-i18next";
import type { WorldGraphNode } from "@shared/types";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { CANVAS_SECTION_KEYS } from "../shared/constants";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { BinderInspector } from "./BinderInspector";
import { BinderRelated } from "./BinderRelated";
import { BinderSuggestions } from "./BinderSuggestions";
import { BinderAgent } from "./BinderAgent";
import { BinderSection } from "./BinderSection";

interface CanvasBinderBarProps {
  graphNodes: readonly WorldGraphNode[];
}

/**
 * 우측 BinderBar — Obsidian 스타일.
 *
 *   Inspector    : 선택 대상의 상세 (항상 열림)
 *   Related      : 관련 원고/노드/메모 (collapsible)
 *   Suggestions  : Derived 후보 처리 (collapsible)
 *   Agent        : Agent 액션 (collapsible)
 */
export function CanvasBinderBar({ graphNodes }: CanvasBinderBarProps) {
  const { t } = useTranslation();
  const selection = useCanvasUiStore((s) => s.selection);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 py-2">
          <BinderSection title={t(CANVAS_SECTION_KEYS.inspector)}>
            <BinderInspector selection={selection} graphNodes={graphNodes} />
          </BinderSection>

          <BinderSection title={t(CANVAS_SECTION_KEYS.related)} collapsible>
            <BinderRelated />
          </BinderSection>

          <BinderSection
            title={t(CANVAS_SECTION_KEYS.suggestions)}
            collapsible
          >
            <BinderSuggestions />
          </BinderSection>

          <BinderSection title={t(CANVAS_SECTION_KEYS.agent)} collapsible>
            <BinderAgent selection={selection} />
          </BinderSection>
        </div>
      </ScrollArea>
    </aside>
  );
}
