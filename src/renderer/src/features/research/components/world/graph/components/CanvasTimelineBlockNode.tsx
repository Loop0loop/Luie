import { memo, useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  GitCommit,
  ArrowRight,
  Maximize2,
  Palette,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import type { NodeProps } from "reactflow";
import { Position, Handle, useReactFlow } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { Button } from "@renderer/components/ui/button";

// --- [Type Definitions] ---
export type TimelineSequenceNode = {
  id: string;
  content: string;
  isHeld: boolean;
  topBranches: TimelineSequenceNode[][];
  bottomBranches: TimelineSequenceNode[][];
};

export type CanvasTimelineBlockData = {
  label: string;
  sequence: TimelineSequenceNode[];
  color?: string;
  onChangeColor?: (id: string) => void;
  onDataChange?: (
    id: string,
    patch: Partial<
      Omit<
        CanvasTimelineBlockData,
        "onChangeColor" | "onUpdateSequence" | "onDelete" | "onDataChange"
      >
    >,
  ) => void;
  onUpdateSequence?: (id: string, newSequence: TimelineSequenceNode[]) => void;
  onDelete?: (id: string) => void;
};

const genId = () => Math.random().toString(36).substring(2, 9);

/**
 * Timeline Node for React Flow
 * Implements a recursive branching structure based on Boardmix/XMind UX.
 */
export const CanvasTimelineBlockNode = memo(
  ({ id, data, selected }: NodeProps<CanvasTimelineBlockData>) => {
    const { sequence = [], onUpdateSequence } = data;
    const reactFlow = useReactFlow();
    const [activeInternalNodeId, setActiveInternalNodeId] = useState<
      string | null
    >(null);

    useEffect(() => {
      if (!selected) {
        setActiveInternalNodeId(null);
      }
    }, [selected]);

    // State update logic for recursive branches
    const handleAction = useCallback(
      (
        action: string,
        targetId: string,
        payload: { content?: string } = {},
      ) => {
        const traverseAndApply = (
          seq: TimelineSequenceNode[],
        ): TimelineSequenceNode[] => {
          return seq.reduce((acc: TimelineSequenceNode[], node) => {
            let updatedNode = { ...node };

            // 1. Delete Logic
            if (action === "delete" && node.id === targetId) {
              return acc;
            }

            // Recursive traversal for branches
            updatedNode.topBranches = node.topBranches
              .map(traverseAndApply)
              .filter((b) => b.length > 0);
            updatedNode.bottomBranches = node.bottomBranches
              .map(traverseAndApply)
              .filter((b) => b.length > 0);

            // 2. Node specific updates
            if (node.id === targetId) {
              switch (action) {
                case "update":
                  updatedNode.content = payload.content ?? "";
                  break;
                case "toggle_hold":
                  updatedNode.isHeld = !node.isHeld;
                  break;
                case "branch_top":
                  updatedNode.topBranches.push([
                    {
                      id: genId(),
                      content: "",
                      isHeld: false,
                      topBranches: [],
                      bottomBranches: [],
                    },
                  ]);
                  break;
                case "branch_bottom":
                  updatedNode.bottomBranches.push([
                    {
                      id: genId(),
                      content: "",
                      isHeld: false,
                      topBranches: [],
                      bottomBranches: [],
                    },
                  ]);
                  break;
              }
            }

            acc.push(updatedNode);

            // 3. Sequential extension
            if (action === "add_main" && node.id === targetId) {
              acc.push({
                id: genId(),
                content: "",
                isHeld: false,
                topBranches: [],
                bottomBranches: [],
              });
            }

            return acc;
          }, []);
        };

        const nextSequence = traverseAndApply(sequence);
        onUpdateSequence?.(id, nextSequence);
      },
      [id, sequence, onUpdateSequence],
    );

    const handleZoom = useCallback(() => {
      const node = reactFlow.getNode(id);
      if (!node) {
        return;
      }

      void reactFlow.fitBounds(
        {
          x: node.position.x,
          y: node.position.y,
          width: node.width ?? 360,
          height: node.height ?? 220,
        },
        { padding: 0.45, duration: 220 },
      );
    }, [id, reactFlow]);

    return (
      <div className="relative flex flex-col items-start p-4 bg-transparent">
        <div className="mb-3 w-full max-w-[320px] rounded-xl border border-white/10 bg-[#11151c]/90 px-3 py-2 backdrop-blur">
          <input
            value={data.label ?? ""}
            onChange={(event) => {
              data.onDataChange?.(id, { label: event.target.value });
            }}
            placeholder="타임라인 제목"
            className="nodrag nopan w-full bg-transparent text-[13px] font-semibold text-fg/90 placeholder:text-fg/30 focus:outline-none"
          />
        </div>

        <SequenceRender
          sequence={sequence}
          isMainTrack={true}
          isTimelineSelected={selected}
          activeNodeId={activeInternalNodeId}
          setActiveNodeId={setActiveInternalNodeId}
          onAction={handleAction}
          onChangeColor={() => data.onChangeColor?.(id)}
          onZoom={handleZoom}
        />

        {(
          [
            { position: Position.Top, axis: "top" },
            { position: Position.Bottom, axis: "bottom" },
            { position: Position.Left, axis: "left" },
            { position: Position.Right, axis: "right" },
          ] as const
        ).map(({ position, axis }) => (
          <span key={`${id}-${axis}-root-handles`}>
            <Handle
              key={`${id}-${axis}-root-source`}
              id={`root-${axis}-source`}
              type="source"
              position={position}
              className={cn(
                "!h-2.5 !w-2.5 !border-0 transition-opacity",
                selected
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
              )}
              style={{ background: data.color ?? "#f59e0b" }}
            />
            <Handle
              key={`${id}-${axis}-root-target`}
              id={`root-${axis}-target`}
              type="target"
              position={position}
              className={cn(
                "!h-2.5 !w-2.5 !border-0 transition-opacity",
                selected
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
              )}
              style={{ background: data.color ?? "#f59e0b" }}
            />
          </span>
        ))}
      </div>
    );
  },
);

// --- [Recursive Sequence Renderer] ---
interface SequenceRenderProps {
  sequence: TimelineSequenceNode[];
  isMainTrack: boolean;
  isTimelineSelected: boolean;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
  onChangeColor: () => void;
  onZoom: () => void;
  onAction: (action: string, id: string, payload?: any) => void;
}

const SequenceRender = ({
  sequence,
  isMainTrack,
  isTimelineSelected,
  activeNodeId,
  setActiveNodeId,
  onChangeColor,
  onZoom,
  onAction,
}: SequenceRenderProps) => {
  if (!sequence?.length) return null;

  const node = sequence[0];
  const remainder = sequence.slice(1);

  const branches = [
    ...node.topBranches.map((b) => ({ type: "top", seq: b })),
    { type: "main", seq: remainder },
    ...node.bottomBranches.map((b) => ({ type: "bottom", seq: b })),
  ];

  return (
    <div className="flex flex-row items-stretch animate-in fade-in duration-300">
      <div className="relative z-20 flex items-center justify-end py-8">
        <InternalNodeCard
          node={node}
          isActive={activeNodeId === node.id}
          canShowToolbar={isTimelineSelected}
          isMainTrack={isMainTrack}
          onClick={() => setActiveNodeId(node.id)}
          onChange={(val: string) =>
            onAction("update", node.id, { content: val })
          }
          onAction={(act: string) => onAction(act, node.id)}
          onChangeColor={onChangeColor}
          onZoom={onZoom}
        />
        <div
          className={cn(
            "w-12 transition-all duration-500",
            isMainTrack ? "h-0.5 bg-amber-500/30" : "h-px bg-white/5",
          )}
        />
      </div>

      <div className="relative flex flex-col justify-center pl-12">
        {branches.map((branch, index) => {
          const isFirst = index === 0;
          const isLast = index === branches.length - 1;
          const isOnly = isFirst && isLast;
          const isMainBranch = branch.type === "main";
          const isEnd = isMainBranch && !branch.seq.length;

          return (
            <div
              key={index}
              className="relative flex items-center py-4 min-h-[100px]"
            >
              {!isOnly && (
                <div
                  className={cn(
                    "absolute left-0 w-12 border-l-2 border-white/5",
                    isFirst ? "top-1/2 bottom-0 rounded-tl-3xl border-t-2" : "",
                    isLast ? "top-0 bottom-1/2 rounded-bl-3xl border-b-2" : "",
                    !isFirst && !isLast ? "top-0 bottom-0" : "",
                  )}
                />
              )}

              <div
                className={cn(
                  "absolute left-0 top-1/2 w-12 h-px -translate-y-1/2",
                  isMainTrack && isMainBranch
                    ? "bg-amber-500/20 h-0.5"
                    : "bg-white/5",
                )}
              />

              <div className="pl-12">
                {isEnd ? (
                  <button
                    onClick={() => onAction("add_main", node.id)}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 transition-all duration-300 border-2 border-dashed rounded-full bg-background/50",
                      isMainTrack
                        ? "border-amber-500/20 text-amber-500/40 hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/5"
                        : "border-white/5 text-muted-foreground/20 hover:border-white/20 hover:text-muted-foreground",
                    )}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                ) : (
                  <SequenceRender
                    sequence={branch.seq}
                    isMainTrack={isMainTrack && isMainBranch}
                    isTimelineSelected={isTimelineSelected}
                    activeNodeId={activeNodeId}
                    setActiveNodeId={setActiveNodeId}
                    onChangeColor={onChangeColor}
                    onZoom={onZoom}
                    onAction={onAction}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- [Internal Card Component] ---
const InternalNodeCard = ({
  node,
  isActive,
  canShowToolbar,
  isMainTrack,
  onClick,
  onChange,
  onChangeColor,
  onZoom,
  onAction,
}: any) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reactFlow = useReactFlow();

  useEffect(() => {
    if (isActive && textareaRef.current && !node.content) {
      textareaRef.current.focus();
    }
  }, [isActive, node.content]);

  return (
    <div className="relative flex items-center group/card">
      {isActive && canShowToolbar && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center p-1 bg-popover/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center px-1 border-r border-white/5 mr-1 gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAction("add_main")}
              className="h-8 px-3 text-[11px] font-black tracking-tight text-foreground/70 hover:text-emerald-400 hover:bg-emerald-500/5"
            >
              <ArrowRight className="mr-1.5 w-3.5 h-3.5" /> 이어가기
            </Button>
          </div>
          <div className="flex items-center px-1 border-r border-white/5 mr-1 gap-0.5">
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => onAction("branch_top")}
              className="w-8 h-8 text-muted-foreground hover:text-indigo-400"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => onAction("branch_bottom")}
              className="w-8 h-8 text-muted-foreground hover:text-indigo-400"
            >
              <ArrowDownRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center px-1 border-r border-white/5 mr-1">
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={onChangeColor}
              className="w-8 h-8 text-muted-foreground hover:text-indigo-300 hover:bg-indigo-500/10"
            >
              <Palette className="w-4 h-4" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={onZoom}
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center px-1 border-r border-white/5 mr-1">
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => onAction("toggle_hold")}
              className={cn(
                "w-8 h-8",
                node.isHeld
                  ? "text-amber-400 bg-amber-500/10"
                  : "text-muted-foreground",
              )}
            >
              {node.isHeld ? (
                <PlayCircle className="w-4 h-4" />
              ) : (
                <PauseCircle className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center pl-1">
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => {
                const flowNode = reactFlow.getNode(node.id);
                if (!flowNode) return;
                void reactFlow.setCenter(
                  flowNode.position.x + (flowNode.width ?? 220) / 2,
                  flowNode.position.y + (flowNode.height ?? 120) / 2,
                  {
                    zoom: 1.2,
                    duration: 220,
                  },
                );
              }}
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => onAction("delete")}
              className="w-8 h-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Quick Add Button on Hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAction("add_main");
        }}
        className="absolute -right-8 flex items-center justify-center w-6 h-6 bg-amber-500 text-black rounded-full shadow-lg opacity-0 group-hover/card:opacity-100 transition-all z-30 hover:scale-110 active:scale-95"
      >
        <Plus className="w-4 h-4" strokeWidth={3} />
      </button>

      <div
        onClick={onClick}
        className={cn(
          "relative flex items-center w-[220px] p-4 bg-secondary/40 border-2 rounded-2xl transition-all duration-300 shadow-sm",
          node.isHeld
            ? "border-dashed border-white/5 opacity-40 grayscale"
            : "border-white/5",
          isActive
            ? "bg-secondary border-amber-500 ring-4 ring-amber-500/5 shadow-2xl scale-[1.05] z-40"
            : "hover:bg-secondary/60 hover:border-white/10",
        )}
      >
        <div
          className={cn(
            "mr-3.5 flex-shrink-0 p-1.5 rounded-full transition-colors",
            node.isHeld
              ? "text-amber-500/40"
              : isMainTrack
                ? "bg-amber-500/10 text-amber-500"
                : "text-muted-foreground/30",
          )}
        >
          {node.isHeld ? (
            <PauseCircle className="w-4 h-4" />
          ) : (
            <GitCommit className="w-4 h-4" strokeWidth={3} />
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={node.content}
          onChange={(e) => onChange(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          placeholder="사건 기록..."
          rows={1}
          className={cn(
            "nodrag nopan w-full text-[13px] font-bold bg-transparent outline-none resize-none overflow-hidden text-foreground/90 placeholder:text-foreground/20",
            node.isHeld && "line-through opacity-50",
          )}
        />
      </div>
    </div>
  );
};

CanvasTimelineBlockNode.displayName = "CanvasTimelineBlockNode";
