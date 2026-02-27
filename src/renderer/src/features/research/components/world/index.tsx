
import { useTranslation } from "react-i18next";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useWorldBuildingStore, type WorldViewMode } from "@renderer/features/research/stores/worldBuildingStore";
import TabButton from "@shared/ui/TabButton";

import { TermManager } from "@renderer/features/research/components/world/TermManager";
import { SynopsisEditor } from "@renderer/features/research/components/world/SynopsisEditor";
import { MindMapBoard } from "@renderer/features/research/components/world/MindMapBoard";
import { DrawingCanvas } from "@renderer/features/research/components/world/DrawingCanvas";
import { PlotBoard } from "@renderer/features/research/components/world/PlotBoard";
import { WorldGraphPanel } from "@renderer/features/research/components/world/graph/WorldGraphPanel";

interface WorldSectionProps {
  worldId?: string;
}

export default function WorldSection({ worldId }: WorldSectionProps) {
  const { t } = useTranslation();
  const { worldTab, setWorldTab } = useUIStore();
  const { viewMode, setViewMode, suggestedMode, dismissSuggestion } = useWorldBuildingStore();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="flex w-full bg-sidebar border-b border-border shrink-0 text-muted select-none">
        <TabButton
          label={t("world.tab.terms")}
          active={worldTab === "terms"}
          onClick={() => setWorldTab("terms")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />
        <TabButton
          label={t("world.tab.synopsis")}
          active={worldTab === "synopsis"}
          onClick={() => setWorldTab("synopsis")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />
        <TabButton
          label={t("world.tab.mindmap")}
          active={worldTab === "mindmap"}
          onClick={() => setWorldTab("mindmap")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />
        <TabButton
          label={t("world.tab.drawing")}
          active={worldTab === "drawing"}
          onClick={() => setWorldTab("drawing")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />
        <TabButton
          label={t("world.tab.plot")}
          active={worldTab === "plot"}
          onClick={() => setWorldTab("plot")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />
        <TabButton
          label="세계관 그래프"
          active={worldTab === "graph"}
          onClick={() => setWorldTab("graph")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />

        {/* View Mode Switcher (Shown only when in Graph Tab) */}
        {worldTab === "graph" && (
          <div className="flex items-center gap-1 ml-auto mr-2 pl-4 border-l border-border">
            {suggestedMode && (
              <div className="flex items-center gap-2 mr-2 px-2 py-1 bg-accent/15 border border-accent/40 rounded text-[10px] text-fg">
                <span>추천: {
                  { standard: "표준", protagonist: "주인공", "event-chain": "사건", freeform: "자유형" }[suggestedMode]
                }</span>
                <button
                  type="button"
                  onClick={() => setViewMode(suggestedMode)}
                  className="px-1.5 rounded bg-accent text-white hover:opacity-85"
                >
                  수락
                </button>
                <button type="button" onClick={dismissSuggestion} className="text-muted hover:text-fg">✕</button>
              </div>
            )}
            {(["standard", "protagonist", "event-chain", "freeform"] as WorldViewMode[]).map((mode) => {
              const labels: Record<WorldViewMode, string> = {
                standard: "표준",
                protagonist: "주인공",
                "event-chain": "사건",
                freeform: "자유형",
              };
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1 text-[10px] rounded shrink-0 transition-colors font-medium border ${viewMode === mode ? "bg-accent text-white border-accent" : "bg-transparent text-muted border-transparent hover:bg-element-hover hover:text-fg"}`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {worldTab === "terms" && <TermManager termId={worldId} />}
        {worldTab === "synopsis" && <SynopsisEditor />}
        {worldTab === "mindmap" && <MindMapBoard />}
        {worldTab === "drawing" && <DrawingCanvas />}
        {worldTab === "plot" && <PlotBoard />}
        {worldTab === "graph" && <WorldGraphPanel />}
      </div>
    </div>
  );
}
