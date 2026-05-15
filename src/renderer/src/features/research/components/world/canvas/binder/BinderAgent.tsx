import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { cn } from "@renderer/lib/utils";
import { CANVAS_AGENT_ACTIONS } from "../shared/constants";
import type { CanvasSelection } from "../types";

interface BinderAgentProps {
  selection: CanvasSelection;
}

interface AgentAction {
  id: string;
  labelKey: string;
}

/**
 * 컨텍스트별 에이전트 액션. 선택 없음 / 노드 / 엣지에 따라
 * 다른 액션 셋을 보여 주어 사용자가 다음 행동으로 자연스럽게 이어가도록 한다.
 */
function getActionsFor(selection: CanvasSelection): AgentAction[] {
  if (selection.kind === "edge") {
    return [
      { id: "edge-conflict", labelKey: CANVAS_AGENT_ACTIONS.edgeConflict },
    ];
  }
  if (selection.kind === "node") {
    return [
      { id: "summarize-node", labelKey: CANVAS_AGENT_ACTIONS.summarizeNode },
      { id: "find-related", labelKey: CANVAS_AGENT_ACTIONS.findRelated },
    ];
  }
  // selection.kind === "none" — 흐름 시작 액션 2개만.
  return [
    { id: "summarize-scope", labelKey: CANVAS_AGENT_ACTIONS.summarizeScope },
    {
      id: "process-candidates",
      labelKey: CANVAS_AGENT_ACTIONS.processCandidates,
    },
  ];
}

/**
 * 에이전트 액션 리스트 — 워크스페이스 hover 톤에 맞춘 row 버튼.
 *
 * 셸 단계에서는 disabled. 데이터 파이프라인이 들어오면 onClick으로
 * 에이전트 호출이 연결된다.
 */
export function BinderAgent({ selection }: BinderAgentProps) {
  const { t } = useTranslation();
  const actions = getActionsFor(selection);

  return (
    <ul className="flex flex-col gap-0.5">
      {actions.map((action) => (
        <li key={action.id}>
          <button
            type="button"
            disabled
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5",
              "text-left text-[12px] leading-tight transition-colors",
              "text-muted",
              "hover:bg-surface-hover hover:text-fg",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <Sparkles className="size-3 shrink-0" />
            <span className="truncate">{t(action.labelKey)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
