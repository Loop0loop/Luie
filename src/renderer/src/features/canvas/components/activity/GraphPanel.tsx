import { useTranslation } from "react-i18next";
import { Settings2, Crosshair, Network, Layers, Target, X, Check } from "lucide-react";
import { useGraphStore } from "../../stores/graph/graphStore";
import { MOCK_GRAPH_NODES } from "../../constants/graphMockData";
import { CANVAS_GRAPH_I18N } from "../../constants/i18n";
import { GRAPH_RELATIONSHIP_FILTERS } from "../../constants/panel";
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
    ...GRAPH_RELATIONSHIP_FILTERS.slice(0, 4),
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
              <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs shadow-sm transition-all animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                    <Target className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-fg truncate">{focusedNode.data.label}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">활성 관계선 추적 중</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFocusId(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
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
              badge={mode === "episode" && <Check className="icon-xs text-accent" />}
            />
            <PanelItem
              label={t(CANVAS_GRAPH_I18N.characterGraph)}
              icon={<Network className="h-4 w-4" />}
              active={mode === "character"}
              onClick={() => setMode("character")}
              badge={mode === "character" && <Check className="icon-xs text-accent" />}
            />
            <PanelItem
              label={t(CANVAS_GRAPH_I18N.eventGraph)}
              icon={<Layers className="h-4 w-4" />}
              active={mode === "event"}
              onClick={() => setMode("event")}
              badge={mode === "event" && <Check className="icon-xs text-accent" />}
            />
            <PanelItem
              label={t(CANVAS_GRAPH_I18N.worldGraph)}
              icon={<Settings2 className="h-4 w-4" />}
              active={mode === "world"}
              onClick={() => setMode("world")}
              badge={mode === "world" && <Check className="icon-xs text-accent" />}
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
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-border transition-all focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:hover:bg-accent-hover [&::-webkit-slider-thumb]:active:scale-110 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>
        </PanelSection>

        {/* Relationship Filters (Interactive ToggleChips) */}
        <PanelSection title={t(CANVAS_GRAPH_I18N.relationships)} defaultOpen>
          <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
            <div className="grid grid-cols-2 gap-1.5">
              {GRAPH_RELATIONSHIP_FILTERS.map((rel) => (
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
