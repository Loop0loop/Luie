import { memo, useCallback, useMemo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { Trash2, BookOpen, Palette, Type } from "lucide-react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useCanvasViewStore } from "../../../stores";
import { CANVAS_COLOR_PALETTE } from "../../../constants/colors";
import "@renderer/styles/components/canvas.css";
import { cn } from "@shared/types/utils";
import type { RFEntityNodeData } from "../../../types/reactFlow.types";
import type { WorldEntitySourceType } from "@shared/types";
import {
  CANVAS_HANDLE_CLASS,
} from "../../../constants";
import { CANVAS_NODE_KIND_COLOUR } from "../../../types/canvasTokens";

const normalizeEntityType = (kind: string): WorldEntitySourceType => {
  const k = kind.toLowerCase();
  if (k === "character") return "Character";
  if (k === "event") return "Event";
  if (k === "faction") return "Faction";
  if (k === "term") return "Term";
  return "WorldEntity";
};

function EntityNodeInner({ id, data, selected, dragging }: NodeProps<RFEntityNodeData>) {
  const { t } = useTranslation();
  const deleteGraphNode = useWorldBuildingStore((s) => s.deleteGraphNode);
  const updateGraphNode = useWorldBuildingStore((s) => s.updateGraphNode);
  const selectNode = useCanvasViewStore((s) => s.selectNode);
  const currentNode = useWorldBuildingStore(
    useCallback((s) => s.graphData?.nodes.find((n) => n.id === id), [id]),
  );

  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(data.label);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const entityType: WorldEntitySourceType = currentNode?.entityType ?? normalizeEntityType(data.kind);
  // NOTE: 매 render마다 새 객체를 만들면 이 값을 dependency로 쓰는 아래 콜백들이 전부
  // 재생성되어 memo된 자식과 이벤트 핸들러 비교가 무의미해진다.
  const currentAttrs = useMemo(
    () =>
      typeof currentNode?.attributes === "object" && currentNode?.attributes !== null
        ? (currentNode.attributes as Record<string, unknown>)
        : {},
    [currentNode],
  );

  const defaultKindColor = CANVAS_NODE_KIND_COLOUR[data.kind] ?? CANVAS_NODE_KIND_COLOUR["world-entity"];
  const nodeColor = data.color || (currentAttrs.color as string | undefined) || defaultKindColor;

  useEffect(() => {
    if (isEditingName) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingName]);

  const handleSaveName = useCallback(async () => {
    setIsEditingName(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== data.label) {
      await updateGraphNode({
        id,
        entityType,
        name: trimmed,
        attributes: currentAttrs,
      });
    }
  }, [draftName, data.label, updateGraphNode, id, entityType, currentAttrs]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleSaveName();
      } else if (e.key === "Escape") {
        setIsEditingName(false);
        setDraftName(data.label);
      }
    },
    [handleSaveName, data.label],
  );

  const handleColorChange = useCallback(
    async (color: string | undefined, e: React.MouseEvent) => {
      e.stopPropagation();
      setIsColorPickerOpen(false);
      await updateGraphNode({
        id,
        entityType,
        attributes: {
          ...currentAttrs,
          color,
        },
      });
    },
    [id, entityType, currentAttrs, updateGraphNode],
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const confirmMsg = t("canvas.node.confirmDelete", {
        defaultValue: "이 노드를 프로젝트에서 삭제하시겠습니까?",
      });
      if (window.confirm(confirmMsg)) {
        await deleteGraphNode(id);
      }
    },
    [id, deleteGraphNode, t],
  );

  const handleOpenInspector = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectNode(id);
      useUIStore.getState().setRegionOpen("rightPanel", true);
    },
    [id, selectNode],
  );

  return (
    <div className="group relative h-full w-full">
      <Handle type="target" position={Position.Top} className={CANVAS_HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} className={CANVAS_HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} className={CANVAS_HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} className={CANVAS_HANDLE_CLASS} />

      {/* 플로팅 툴바 */}
      {selected && !dragging ? (
        <div
          className="pointer-events-auto absolute -top-11 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full canvas-floating-toolbar px-1.5 py-1 select-none animate-in fade-in duration-150"
        >
          {/* 색상 조절 버튼 */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsColorPickerOpen((prev) => !prev);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-fg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              title={t("canvas.node.changeColor", "색상 변경")}
            >
              <Palette className="h-3.5 w-3.5" style={{ color: nodeColor }} />
            </button>

            {/* 컬러 팔레트 팝오버 */}
            {isColorPickerOpen ? (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 rounded-panel canvas-floating-popover flex items-center gap-1 z-dropdown animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => handleColorChange(undefined, e)}
                  className="h-4 w-4 rounded-full border border-white/30 bg-transparent hover:scale-110 transition-transform cursor-pointer"
                  title={t("canvas.color.default", "기본")}
                />
                {CANVAS_COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={(e) => handleColorChange(c.value, e)}
                    className="h-4 w-4 rounded-full hover:scale-110 transition-transform cursor-pointer shadow-sm"
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* 글자 적기 (이름 수정) 버튼 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingName(true);
              setDraftName(data.label);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-fg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            title={t("canvas.node.editName", "적기")}
          >
            <Type className="h-3.5 w-3.5" />
          </button>

          {/* 상세 정보 버튼 */}
          <button
            type="button"
            onClick={handleOpenInspector}
            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-fg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            title={t("canvas.node.openInspector", "상세 정보")}
            aria-label={t("canvas.node.openInspector", "상세 정보")}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </button>

          <div className="w-[1px] h-3 bg-white/15" />

          {/* 삭제 버튼 */}
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-danger-fg/20 text-muted hover:text-danger-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-fg/50 cursor-pointer"
            title={t("canvas.node.delete", "노드 삭제")}
            aria-label={t("canvas.node.delete", "노드 삭제")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* 노드 카드 본체 */}
      <div
        className={cn(
          "canvas-glass-node flex h-full w-full flex-col overflow-hidden transition-[border-color,box-shadow,transform,background-color] duration-200 select-none",
          selected ? "canvas-node-selected" : "canvas-node-normal"
        )}
        style={{
          "--node-color": nodeColor,
        } as React.CSSProperties}
      >
        <div className="flex min-w-0 flex-1 flex-col p-4 justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border/40 bg-element/60 backdrop-blur-sm">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: nodeColor }}
              />
              <span className="text-[10px] font-semibold tracking-wide text-fg/90 uppercase" translate="no">
                {t(`canvas.node.kind.${data.kind}`)}
              </span>
            </div>

            <span className="shrink-0 tabular-nums text-[10px] font-medium text-muted/60">
              {t("canvas.node.connectionCount", { count: data.connectionCount })}
            </span>
          </div>

          <div className="mt-2.5 min-w-0 flex-1">
            {isEditingName ? (
              <input
                ref={inputRef}
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveName}
                className="w-full rounded-md border border-border/80 bg-panel px-2 py-0.5 text-[13px] font-semibold leading-snug tracking-tight text-fg shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                placeholder={t("canvas.node.namePlaceholder", "이름 입력")}
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                  setDraftName(data.label);
                }}
                className="line-clamp-1 text-[13px] font-semibold leading-snug tracking-tight text-fg font-sans cursor-default"
                title={t("canvas.node.doubleClickToEdit", "더블 클릭하여 수정")}
              >
                {data.label}
              </span>
            )}

            {data.description ? (
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted font-sans">
                {data.description}
              </p>
            ) : (
              <p className="mt-1 text-[11px] leading-relaxed text-subtle/70 italic font-sans">
                {t("canvas.node.emptyDescription")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const EntityNode = memo(EntityNodeInner);
