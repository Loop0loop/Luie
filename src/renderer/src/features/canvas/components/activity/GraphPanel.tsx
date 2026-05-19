import { useTranslation } from "react-i18next";
import { Settings2, Crosshair, Network, Layers } from "lucide-react";
import { useGraphStore } from "../../stores/graph/graphStore";
import { CANVAS_GRAPH_I18N } from "../../constants/i18n";
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
        <PanelSection title={t(CANVAS_GRAPH_I18N.scope)}>
          <div className="flex flex-col gap-1.5 px-panel-pad pb-2 pt-1">
            <button
              type="button"
              onClick={() => setMode("episode")}
              className={`flex items-center gap-2 rounded-control px-control-x py-control-y text-xs transition-colors ${
                mode === "episode" ? "bg-active font-medium text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
              }`}
            >
              <Crosshair className="icon-xs" />
              <span>{t(CANVAS_GRAPH_I18N.episodeGraph)}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("character")}
              className={`flex items-center gap-2 rounded-control px-control-x py-control-y text-xs transition-colors ${
                mode === "character" ? "bg-active font-medium text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
              }`}
            >
              <Network className="icon-xs" />
              <span>{t(CANVAS_GRAPH_I18N.characterGraph)}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("event")}
              className={`flex items-center gap-2 rounded-control px-control-x py-control-y text-xs transition-colors ${
                mode === "event" ? "bg-active font-medium text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
              }`}
            >
              <Layers className="icon-xs" />
              <span>{t(CANVAS_GRAPH_I18N.eventGraph)}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("world")}
              className={`flex items-center gap-2 rounded-control px-control-x py-control-y text-xs transition-colors ${
                mode === "world" ? "bg-active font-medium text-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
              }`}
            >
              <Settings2 className="icon-xs" />
              <span>{t(CANVAS_GRAPH_I18N.worldGraph)}</span>
            </button>
          </div>
        </PanelSection>

        {/* Depth Control */}
        <PanelSection title={t(CANVAS_GRAPH_I18N.depthLimit)} defaultOpen>
          <div className="px-panel-pad pb-3 pt-2">
            <div className="flex items-center justify-between text-[11px] text-muted mb-2">
              <span>{t(CANVAS_GRAPH_I18N.depth, { depth })}</span>
              <span>{t(CANVAS_GRAPH_I18N.depthRange)}</span>
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
        <PanelSection title={t(CANVAS_GRAPH_I18N.relationships)} defaultOpen={false}>
          <div className="px-panel-pad py-control-y text-[11px] text-muted">
            {t(CANVAS_GRAPH_I18N.relationshipFilters)}
          </div>
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}
