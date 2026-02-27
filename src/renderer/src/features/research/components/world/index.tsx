
import { useTranslation } from "react-i18next";
import { useUIStore, type WorldTab } from "@renderer/features/workspace/stores/uiStore";
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

const WORLD_TAB_ITEMS: Array<{ key: WorldTab; labelKey: string }> = [
  { key: "terms", labelKey: "world.tab.terms" },
  { key: "synopsis", labelKey: "world.tab.synopsis" },
  { key: "mindmap", labelKey: "world.tab.mindmap" },
  { key: "drawing", labelKey: "world.tab.drawing" },
  { key: "plot", labelKey: "world.tab.plot" },
  { key: "graph", labelKey: "world.tab.graph" },
];

const VIEW_MODE_LABEL_KEY: Record<WorldViewMode, string> = {
  standard: "world.graph.mode.standard",
  protagonist: "world.graph.mode.protagonist",
  "event-chain": "world.graph.mode.eventChain",
  freeform: "world.graph.mode.freeform",
};

export default function WorldSection({ worldId }: WorldSectionProps) {
  const { t } = useTranslation();
  const worldTab = useUIStore((state) => state.worldTab);
  const setWorldTab = useUIStore((state) => state.setWorldTab);
  const viewMode = useWorldBuildingStore((state) => state.viewMode);
  const setViewMode = useWorldBuildingStore((state) => state.setViewMode);
  const suggestedMode = useWorldBuildingStore((state) => state.suggestedMode);
  const dismissSuggestion = useWorldBuildingStore((state) => state.dismissSuggestion);

  return (
    <div className="flex h-full min-h-0 flex-col bg-app">
      <div className="flex w-full items-center justify-between shrink-0 select-none border-b border-border/60 bg-sidebar/50 backdrop-blur-xl px-4 py-2 text-muted shadow-sm z-20">

        {/* 프리미엄 세그먼트 컨트롤 스타일 탭 */}
        <div className="flex items-center gap-1 bg-element rounded-lg p-1 border border-border/50">
          {WORLD_TAB_ITEMS.map((item) => (
            <TabButton
              key={item.key}
              label={t(item.labelKey)}
              active={worldTab === item.key}
              onClick={() => setWorldTab(item.key)}
              className="flex-1 cursor-pointer px-4 py-1.5 rounded-md text-center text-[12px] font-medium transition-all duration-200 hover:text-fg"
              activeClassName="bg-sidebar text-fg shadow-sm border border-border/50 font-semibold"
            />
          ))}
        </div>

        {/* 뷰 모드 스위처 (그래프 탭 전용) */}
        {worldTab === "graph" && (
          <div className="flex items-center gap-2">
            {suggestedMode && (
              <div className="mr-2 flex items-center gap-2 rounded border border-accent/40 bg-accent/15 px-2 py-1 text-[10px] text-fg">
                <span>
                  {t("world.graph.suggestionPrefix")}: {t(VIEW_MODE_LABEL_KEY[suggestedMode])}
                </span>
                <button
                  type="button"
                  onClick={() => setViewMode(suggestedMode)}
                  className="rounded bg-accent px-1.5 text-white hover:opacity-85"
                >
                  {t("world.graph.suggestionApply")}
                </button>
                <button
                  type="button"
                  onClick={dismissSuggestion}
                  className="text-muted hover:text-fg"
                >
                  ✕
                </button>
              </div>
            )}
            {/* 프리미엄 모드 스위처 */}
            <div className="flex items-center bg-element rounded-lg p-1 border border-border/50 outline-none">
              {(["standard", "protagonist", "event-chain", "freeform"] as WorldViewMode[]).map((mode) => {
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${viewMode === mode
                        ? "bg-accent text-white shadow-sm shadow-accent/20"
                        : "bg-transparent text-muted hover:text-fg"
                      }`}
                  >
                    {t(VIEW_MODE_LABEL_KEY[mode])}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
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
