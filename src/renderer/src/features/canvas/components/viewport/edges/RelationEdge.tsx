import { memo, useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
import { useTranslation } from "react-i18next";
import {
  Trash2,
  Palette,
  ArrowRight,
  ArrowLeftRight,
  Minus,
  Type,
} from "lucide-react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { CANVAS_COLOR_PALETTE } from "../../../constants/colors";
import { getEdgeStyle } from "../../../utils/edgeStyles";
import type { RFRelationEdgeData } from "../../../types/reactFlow.types";
import type { WorldGraphCanvasEdgeDirection } from "@shared/types";

function RelationEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd: injectedMarkerEnd,
  markerStart: injectedMarkerStart,
}: EdgeProps<RFRelationEdgeData>) {
  const { t } = useTranslation();
  const rawId = data?.rawId ?? id.replace(/^rel-/, "");
  const updateRelation = useWorldBuildingStore((s) => s.updateRelation);
  const deleteRelation = useWorldBuildingStore((s) => s.deleteRelation);
  const currentRelation = useWorldBuildingStore(
    useCallback((s) => s.graphData?.edges.find((e) => e.id === rawId), [rawId]),
  );

  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data?.label ?? "");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // NOTE: 매 render마다 새 객체를 만들면 이 값을 dependency로 쓰는 아래 콜백들이 전부
  // 재생성되어 memo된 edge 렌더 비교가 무의미해진다.
  const currentAttrs = useMemo(
    () =>
      typeof currentRelation?.attributes === "object" &&
      currentRelation?.attributes !== null
        ? (currentRelation.attributes as Record<string, unknown>)
        : {},
    [currentRelation],
  );

  const direction: WorldGraphCanvasEdgeDirection =
    data?.direction ?? (currentAttrs.direction as WorldGraphCanvasEdgeDirection) ?? "unidirectional";

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeColour = data?.color ?? (currentAttrs.color as string | undefined) ?? "var(--text-secondary)";
  const edgeStyle = getEdgeStyle(selected ?? false, strokeColour);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSaveLabel = useCallback(async () => {
    setIsEditing(false);
    const trimmed = draftLabel.trim();
    if (trimmed !== (data?.label ?? "")) {
      await updateRelation({
        id: rawId,
        relation: (trimmed || "belongs_to") as never,
        attributes: {
          ...currentAttrs,
          label: trimmed,
        },
      });
    }
  }, [draftLabel, data?.label, updateRelation, rawId, currentAttrs]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleSaveLabel();
      } else if (e.key === "Escape") {
        setIsEditing(false);
        setDraftLabel(data?.label ?? "");
      }
    },
    [handleSaveLabel, data?.label],
  );

  const handleDirectionCycle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const nextDirection: WorldGraphCanvasEdgeDirection =
        direction === "unidirectional"
          ? "bidirectional"
          : direction === "bidirectional"
            ? "none"
            : "unidirectional";

      await updateRelation({
        id: rawId,
        attributes: {
          ...currentAttrs,
          direction: nextDirection,
        },
      });
    },
    [direction, rawId, currentAttrs, updateRelation],
  );

  const handleColorChange = useCallback(
    async (color: string | undefined, e: React.MouseEvent) => {
      e.stopPropagation();
      setIsColorPickerOpen(false);
      await updateRelation({
        id: rawId,
        attributes: {
          ...currentAttrs,
          color,
        },
      });
    },
    [rawId, currentAttrs, updateRelation],
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await deleteRelation(rawId);
    },
    [deleteRelation, rawId],
  );

  const fallbackMarker = "url(#react-flow__arrowclosed)";
  const resolvedMarkerEnd =
    direction !== "none"
      ? (injectedMarkerEnd || fallbackMarker)
      : undefined;

  const resolvedMarkerStart =
    direction === "bidirectional"
      ? (injectedMarkerStart || injectedMarkerEnd || fallbackMarker)
      : undefined;

  const labelText = data?.label || currentRelation?.relation || "";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={resolvedMarkerStart}
        markerEnd={resolvedMarkerEnd}
        style={edgeStyle}
      />

      <EdgeLabelRenderer>
        {/* 플로팅 툴바 (선택 시 상단에 표시) */}
        {selected ? (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 14}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan z-30 flex items-center gap-1 rounded-full canvas-floating-toolbar px-1.5 py-1 select-none animate-in fade-in duration-150"
          >
            {/* 방향 조절 버튼 */}
            <button
              type="button"
              onClick={handleDirectionCycle}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-fg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              title={
                direction === "none"
                  ? t("canvas.edge.direction.none", "무방향")
                  : direction === "bidirectional"
                    ? t("canvas.edge.direction.bidirectional", "양방향")
                    : t("canvas.edge.direction.unidirectional", "단방향")
              }
            >
              {direction === "none" ? (
                <Minus className="h-3.5 w-3.5" />
              ) : direction === "bidirectional" ? (
                <ArrowLeftRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </button>

            {/* 색상 조절 버튼 */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsColorPickerOpen((prev) => !prev);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-fg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                title={t("canvas.edge.changeColor", "색상 변경")}
              >
                <Palette className="h-3.5 w-3.5" style={{ color: data?.color }} />
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

            {/* 글자 적기 버튼 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setDraftLabel(labelText);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-fg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              title={t("canvas.edge.editLabel", "글자 적기")}
            >
              <Type className="h-3.5 w-3.5" />
            </button>

            <div className="w-[1px] h-3 bg-white/15" />

            {/* 삭제 버튼 */}
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-danger-fg/20 text-muted hover:text-danger-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-fg/50 cursor-pointer"
              title={t("canvas.edge.delete", "관계선 삭제")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {/* 관계선 중간 라벨 / 인라인 에디팅 */}
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan select-none"
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveLabel}
              className="h-6 min-w-[70px] max-w-[160px] rounded-full border border-border/80 bg-panel px-2.5 py-0.5 text-center text-[11px] font-medium text-fg shadow-panel outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              placeholder={t("canvas.edge.labelPlaceholder", "관계 입력")}
            />
          ) : labelText ? (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setDraftLabel(labelText);
              }}
              style={{
                color: strokeColour !== "var(--text-secondary)" ? strokeColour : undefined,
                borderColor: strokeColour !== "var(--text-secondary)" ? `${strokeColour}40` : undefined,
              }}
              className="rounded-full border border-border/40 bg-panel/90 px-2.5 py-0.5 text-[11px] font-medium text-muted shadow-sm backdrop-blur-sm transition-colors hover:border-border/80 hover:text-fg cursor-default"
              title={t("canvas.edge.doubleClickToEdit", "더블 클릭하여 수정")}
            >
              {labelText}
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const RelationEdge = memo(RelationEdgeInner);

