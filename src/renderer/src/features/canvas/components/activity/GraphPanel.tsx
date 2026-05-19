import { useTranslation } from "react-i18next";
import { Settings2, Crosshair, Network, Layers } from "lucide-react";
import { useGraphStore } from "../../stores/graph/graphStore";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
} from "./shared";

export default function GraphPanel() {
  const { t } = useTranslation();
  const { mode, depth, setMode, setDepth } = useGraphStore();

  return (
    <PanelRoot>
      <PanelHeader title={t("canvas.activity.graph")} />
      <PanelBody>
        {/* Mode Selection */}
        <PanelSection title="Graph Scope">
          <div className="flex flex-col gap-1.5 px-4 pb-2 pt-1">
            <button
              type="button"
              onClick={() => setMode("episode")}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                mode === "episode" ? "bg-active font-medium text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
              }`}
            >
              <Crosshair className="icon-xs" />
              <span>Episode Graph (Current)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("character")}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                mode === "character" ? "bg-active font-medium text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
              }`}
            >
              <Network className="icon-xs" />
              <span>Character Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("event")}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                mode === "event" ? "bg-active font-medium text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
              }`}
            >
              <Layers className="icon-xs" />
              <span>Event Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("world")}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                mode === "world" ? "bg-active font-medium text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
              }`}
            >
              <Settings2 className="icon-xs" />
              <span>World Graph</span>
            </button>
          </div>
        </PanelSection>

        {/* Depth Control */}
        <PanelSection title="Depth Limit" defaultOpen>
          <div className="px-4 pb-3 pt-2">
            <div className="flex items-center justify-between text-[11px] text-muted mb-2">
              <span>Depth: {depth}</span>
              <span>1-hop to 3-hop</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={1}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value) as 1 | 2 | 3)}
              className="w-full accent-accent"
            />
          </div>
        </PanelSection>

        {/* Relationship Filters Placeholder */}
        <PanelSection title="Relationships" defaultOpen={false}>
          <div className="px-4 py-2 text-[11px] text-muted">
            Filters for relationships (Appear, Dialog, Conflict) will go here.
          </div>
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}
