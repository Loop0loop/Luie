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
 * Agent 액션 — Obsidian 스타일 리스트 아이템.
 *
 * 채팅창이 아니라 선택 대상에 대한 액션을 리스트로 노출.
 * hover 시 muted 배경, 좌측에 Sparkles 아이콘.
 * 셸 단계에서는 disabled.
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
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5",
              "text-left text-[12px] leading-tight transition-colors",
              "text-muted-foreground",
              "hover:bg-muted/60 hover:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50",
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
