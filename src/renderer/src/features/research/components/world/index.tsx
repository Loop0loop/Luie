
import { useTranslation } from "react-i18next";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
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
