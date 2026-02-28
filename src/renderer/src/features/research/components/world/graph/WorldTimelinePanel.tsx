/**
 * WorldTimelinePanel
 * 캔버스 하단에서 슬라이드 업되는 수평 스크롤 타임라인
 * Event 노드의 attributes.time 을 기반으로 자동 정렬
 */

import { useMemo, useCallback } from "react";
import { X, Clock, CircleDot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import type { WorldGraphNode, EntityRelation } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { WORLD_GRAPH_NODE_THEMES } from "@shared/constants/worldGraphUI";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_PRESET_ORDER = ["서막", "전편", "중편", "후편", "에필로그"] as const;

const TIMELINE_LANE_HEIGHT_PX = 80;
const UNSCHEDULED_LABEL = "미정";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineColumn {
    label: string;
    nodes: WorldGraphNode[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTimeKey(node: WorldGraphNode): string {
    const t = node.attributes?.time;
    return typeof t === "string" && t.trim() ? t.trim() : UNSCHEDULED_LABEL;
}

function buildColumns(nodes: WorldGraphNode[]): TimelineColumn[] {
    const buckets = new Map<string, WorldGraphNode[]>();

    for (const node of nodes) {
        const key = getTimeKey(node);
        const list = buckets.get(key) ?? [];
        list.push(node);
        buckets.set(key, list);
    }

    const columns: TimelineColumn[] = [];

    // 프리셋 순서로 먼저
    for (const preset of TIME_PRESET_ORDER) {
        const nodes = buckets.get(preset);
        if (nodes) {
            columns.push({ label: preset, nodes });
            buckets.delete(preset);
        }
    }

    // 사용자 정의 시기 (알파벳 정렬)
    const customKeys = [...buckets.keys()].filter((k) => k !== UNSCHEDULED_LABEL).sort();
    for (const key of customKeys) {
        const nodes = buckets.get(key);
        if (nodes) {
            columns.push({ label: key, nodes });
        }
    }

    // 미정은 항상 마지막
    const unscheduled = buckets.get(UNSCHEDULED_LABEL);
    if (unscheduled && unscheduled.length > 0) {
        columns.push({ label: UNSCHEDULED_LABEL, nodes: unscheduled });
    }

    return columns;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TimelineNodeCardProps {
    node: WorldGraphNode;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

function TimelineNodeCard({ node, isSelected, onSelect }: TimelineNodeCardProps) {
    const displayType = node.subType ?? node.entityType;
    const theme = WORLD_GRAPH_NODE_THEMES[displayType] ?? WORLD_GRAPH_NODE_THEMES.WorldEntity;

    return (
        <button
            type="button"
            onClick={() => onSelect(node.id)}
            className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all hover:-translate-y-0.5 cursor-pointer whitespace-nowrap",
                isSelected
                    ? "bg-accent/20 border-accent/60 shadow-md"
                    : "bg-element/60 border-border/50 hover:border-accent/40 hover:bg-element",
            )}
        >
            <div className={cn("w-2 h-2 rounded-full shrink-0", theme.iconBg)} />
            <span className="text-[12px] font-semibold text-fg">{node.name}</span>
        </button>
    );
}

interface TimelineColumnProps {
    column: TimelineColumn;
    isUnscheduled: boolean;
    selectedNodeId: string | null;
    onSelect: (id: string) => void;
}

function TimelineColumnSection({ column, isUnscheduled, selectedNodeId, onSelect }: TimelineColumnProps) {
    return (
        <div className="flex flex-col shrink-0 min-w-[140px] max-w-[220px]">
            {/* 시기 라벨 */}
            <div className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 pb-2 mb-2 border-b",
                isUnscheduled ? "text-muted/50 border-border/20" : "text-accent/80 border-accent/30",
            )}>
                {column.label}
                <span className="ml-1.5 text-muted/60">({column.nodes.length})</span>
            </div>
            {/* 노드 카드들 */}
            <div className="flex flex-col gap-1.5">
                {column.nodes.map((node) => (
                    <TimelineNodeCard
                        key={node.id}
                        node={node}
                        isSelected={selectedNodeId === node.id}
                        onSelect={onSelect}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface WorldTimelinePanelProps {
    nodes: WorldGraphNode[];
    edges: EntityRelation[];
}

export function WorldTimelinePanel({ nodes }: WorldTimelinePanelProps) {
    const { t } = useTranslation();
    const toggleTimeline = useWorldBuildingStore((s) => s.toggleTimeline);
    const selectedNodeId = useWorldBuildingStore((s) => s.selectedNodeId);
    const selectNode = useWorldBuildingStore((s) => s.selectNode);

    // Event 타입 노드만 or time 속성이 있는 노드
    const timelineNodes = useMemo(
        () =>
            nodes.filter(
                (n) =>
                    n.entityType === "Event" ||
                    (n.attributes?.time && typeof n.attributes.time === "string"),
            ),
        [nodes],
    );

    const columns = useMemo(() => buildColumns(timelineNodes), [timelineNodes]);

    const handleSelectNode = useCallback(
        (id: string) => {
            selectNode(id);
        },
        [selectNode],
    );

    if (timelineNodes.length === 0) {
        return (
            <div className="flex items-center justify-between h-full px-5">
                <div className="flex items-center gap-3 text-muted">
                    <Clock size={18} className="opacity-40" />
                    <div>
                        <p className="text-[13px] font-semibold">
                            {t("world.timeline.empty", { defaultValue: "타임라인에 표시할 사건이 없습니다" })}
                        </p>
                        <p className="text-[11px] opacity-60 mt-0.5">
                            {t("world.timeline.emptyHint", { defaultValue: "Event 노드를 추가하거나 time 속성을 설정하세요" })}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={toggleTimeline}
                    className="p-1.5 text-muted hover:text-fg hover:bg-element rounded-md transition-all"
                >
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2">
                    <Clock size={13} className="text-accent" />
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                        {t("world.timeline.title", { defaultValue: "시간선" })}
                    </span>
                    <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">
                        {timelineNodes.length}개 사건
                    </span>
                </div>
                <button
                    type="button"
                    onClick={toggleTimeline}
                    className="p-1.5 text-muted hover:text-fg hover:bg-element rounded-md transition-all"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Timeline Scroll Area */}
            <div
                className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar px-4 py-3"
                style={{ minHeight: TIMELINE_LANE_HEIGHT_PX }}
            >
                {/* Guide line */}
                <div className="relative flex items-start gap-0">
                    {/* Connector line */}
                    <div className="absolute top-[22px] left-0 right-0 h-px bg-accent/20 z-0" />

                    <div className="flex gap-6 relative z-10">
                        {columns.map((col, idx) => (
                            <div key={col.label} className="flex gap-6 items-start">
                                {/* Column divider dot */}
                                {idx > 0 && (
                                    <div className="flex flex-col items-center shrink-0 pt-[14px]">
                                        <CircleDot size={10} className="text-accent/40" />
                                    </div>
                                )}
                                <TimelineColumnSection
                                    column={col}
                                    isUnscheduled={col.label === UNSCHEDULED_LABEL}
                                    selectedNodeId={selectedNodeId}
                                    onSelect={handleSelectNode}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
