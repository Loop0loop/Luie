import { useTranslation } from "react-i18next";
import type { WorldGraphNode } from "@shared/types";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { CANVAS_SECTION_KEYS } from "../shared/constants";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { BinderInspector } from "./BinderInspector";
import { BinderRelated } from "./BinderRelated";
import { BinderAgent } from "./BinderAgent";
import { BinderSection } from "./BinderSection";

interface CanvasBinderBarProps {
  graphNodes: readonly WorldGraphNode[];
}

/**
 * 우측 인스펙터(BinderBar) — Scrivener Inspector와 같은 결.
 *
 * 빈 상태 처리 원칙: 비어있는 섹션은 그리지 않는다.
 *   - 선택 없음 → 인스펙터(빈 안내) + 에이전트(범위 액션) 두 섹션
 *   - 노드/엣지 선택 → 인스펙터 + 연결된 항목 + 에이전트
 *
 * Suggestions(자동 추출 후보)는 후보가 실제로 존재할 때만 렌더되어야
 * 한다. 셸 단계에서는 후보 데이터가 없으므로 렌더하지 않음.
 */
export function CanvasBinderBar({ graphNodes }: CanvasBinderBarProps) {
  const { t } = useTranslation();
  const selection = useCanvasUiStore((s) => s.selection);

  const hasSelection = selection.kind !== "none";
  const isNodeSelected = selection.kind === "node";

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-panel text-fg">
      {/* 헤더 — Scrivener Inspector 스타일과 동일한 톤 */}
      <header className="flex h-8 shrink-0 items-center border-b border-border bg-surface px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {t(CANVAS_SECTION_KEYS.inspector)}
        </span>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col py-1">
          {/* Inspector 본문 — 빈 상태도 BinderInspector 안에서 처리 */}
          <BinderSection>
            <BinderInspector selection={selection} graphNodes={graphNodes} />
          </BinderSection>

          {/* 노드가 선택됐을 때만 연결 항목 섹션 노출 */}
          {isNodeSelected ? (
            <BinderSection
              title={t(CANVAS_SECTION_KEYS.related)}
              collapsible
            >
              <BinderRelated />
            </BinderSection>
          ) : null}

          {/* 에이전트는 선택 여부에 따라 카드가 바뀜 — 항상 노출 */}
          <BinderSection
            title={t(CANVAS_SECTION_KEYS.agent)}
            divider={hasSelection}
          >
            <BinderAgent selection={selection} />
          </BinderSection>
        </div>
      </ScrollArea>
    </aside>
  );
}
