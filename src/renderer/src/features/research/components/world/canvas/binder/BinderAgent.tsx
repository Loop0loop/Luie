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

function getActionsFor(selection: CanvasSelection): AgentAction[] {
  if (selection.kind === "none") {
    return [
      { id: "summarize-scope", labelKey: CANVAS_AGENT_ACTIONS.summarizeScope },
      {
        id: "process-candidates",
        labelKey: CANVAS_AGENT_ACTIONS.processCandidates,
      },
      { id: "check-timeline", labelKey: CANVAS_AGENT_ACTIONS.checkTimeline },
    ];
  }
  if (selection.kind === "edge") {
    return [
      { id: "edge-conflict", labelKey: CANVAS_AGENT_ACTIONS.edgeConflict },
    ];
  }
  return [
    { id: "summarize-node", labelKey: CANVAS_AGENT_ACTIONS.summarizeNode },
    { id: "find-related", labelKey: CANVAS_AGENT_ACTIONS.findRelated },
  ];
}

/**
 * Agent 액션 버튼 영역.
 * 채팅창이 아니라 "선택 대상에 대해 무엇을 할 수 있는가"를 액션으로 노출한다.
 *
 * 셸 단계에서는 disabled 상태로 라벨만 노출.
 */
export function BinderAgent({ selection }: BinderAgentProps) {
  const { t } = useTranslation();
  const actions = getActionsFor(selection);

  return (
    <ul className="flex flex-col gap-1">
      {actions.map((action) => (
        <li key={action.id}>
          <button
            type="button"
            disabled
            className={cn(
              "flex w-full items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5",
              "text-left text-[12px] text-foreground/80 transition-colors",
              "hover:bg-muted hover:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{t(action.labelKey)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
