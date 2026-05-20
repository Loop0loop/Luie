import { useTranslation } from "react-i18next";
import { Settings2, Crosshair, Network, Layers, Target, X } from "lucide-react";
import { useGraphStore } from "../../stores/graph/graphStore";
import { MOCK_GRAPH_NODES } from "../../constants/graphMockData";
import { CANVAS_GRAPH_I18N } from "../../constants/i18n";
import { useState } from "react";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
  PanelItem,
  ToggleChip,
} from "./shared";

export default function GraphPanel() {
  const { t } = useTranslation();
  const { mode, depth, focusId, setMode, setDepth, setFocusId } = useGraphStore();

  // 관계 필터 로컬 토글 상태 (목업)
  const [activeRelations, setActiveRelations] = useState<string[]>([
    "등장",
    "대화",
    "갈등",
    "소속",
  ]);

  const toggleRelation = (rel: string) => {
    setActiveRelations((prev) =>
      prev.includes(rel) ? prev.filter((r) => r !== rel) : [...prev, rel]
    );
  };

  // 포커싱된 노드 이름 조회
  const focusedNode = MOCK_GRAPH_NODES.find((node) => node.id === focusId);

  return (
    <PanelRoot>
      <PanelHeader title={t("canvas.activity.graph")} />
      <PanelBody>
        {/* Focus Control (Obsidian Local Graph Focus Entity) */}
        {focusId && focusedNode && (
          <PanelSection title={t("canvas.graph.focus")} defaultOpen>
            <div className="px-3 pb-3 pt-1">
              <div className="flex items-center justify-between rounded border border-accent/25 bg-accent/10 px-2.5 py-1.5 text-xs text-accent">
                <div className="flex items-center gap-1.5 font-medium">
                  <Target className="h-3.5 w-3.5" />
                  <span>{focusedNode.data.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusId(null)}
                  className="rounded p-0.5 hover:bg-accent/20 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </PanelSection>
        )}

        {/* Mode Selection */}
        <PanelSection title={t(CANVAS_GRAPH_I18N.scope)}>
          <div className="flex flex-col gap-0.5">
            <PanelItem
              label={t(CANVAS_GRAPH_I18N.episodeGraph)}
              icon={<Crosshair className="h-4 w-4" />}
              active={mode === "episode"}
              onClick={() => setMode("episode")}
            />
            <PanelItem
              label={t(CANVAS_GRAPH_I18N.characterGraph)}
              icon={<Network className="h-4 w-4" />}
              active={mode === "character"}
              onClick={() => setMode("character")}
            />
            <PanelItem
              label={t(CANVAS_GRAPH_I18N.eventGraph)}
              icon={<Layers className="h-4 w-4" />}
              active={mode === "event"}
              onClick={() => setMode("event")}
            />
            <PanelItem
              label={t(CANVAS_GRAPH_I18N.worldGraph)}
              icon={<Settings2 className="h-4 w-4" />}
              active={mode === "world"}
              onClick={() => setMode("world")}
            />
          </div>
        </PanelSection>

        {/* Depth Control */}
        <PanelSection title={t(CANVAS_GRAPH_I18N.depthLimit)} defaultOpen>
          <div className="px-3 pb-3 pt-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2 font-medium">
              <span>{t(CANVAS_GRAPH_I18N.depth, { depth })}</span>
              <span className="opacity-80">{t(CANVAS_GRAPH_I18N.depthRange)}</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={1}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value) as 1 | 2 | 3)}
              className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-border accent-accent hover:accent-accent-hover transition-colors"
            />
          </div>
        </PanelSection>

        {/* Relationship Filters (Interactive ToggleChips) */}
        <PanelSection title={t(CANVAS_GRAPH_I18N.relationships)} defaultOpen>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {["등장", "대화", "갈등", "소속", "동맹", "떡밥"].map((rel) => (
                <ToggleChip
                  key={rel}
                  label={rel}
                  checked={activeRelations.includes(rel)}
                  onChange={() => toggleRelation(rel)}
                />
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground/75 leading-relaxed mt-1">
              {activeRelations.length === 0
                ? "표시 중인 관계 없음"
                : `${activeRelations.join(", ")} 유형 필터 활성화 중`}
            </div>
          </div>
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}
