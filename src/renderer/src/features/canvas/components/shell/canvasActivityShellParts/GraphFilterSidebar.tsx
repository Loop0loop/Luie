/**
 * GraphFilterSidebar — Redesigned compact graph filter panel.
 *
 * Design decisions:
 *   - Single compact header with mode toggle
 *   - Chapter range as inline compact selector
 *   - Focus node as streamlined dropdown
 *   - Uses DESIGN.md tokens consistently
 */

import { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronDown, Users } from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@shared/types/utils";

import { useGraphStore } from "../../../stores/graph/graphStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { buildGraphSurfaceData } from "../../../utils/graphSurfaceData";

export const GraphFilterSidebar = memo(() => {
  const { t } = useTranslation();
  const activeMode = useGraphStore((state) => state.activeMode);
  const setActiveMode = useGraphStore((state) => state.setActiveMode);
  const selectedFocusNode = useGraphStore((state) => state.selectedFocusNode);
  const setSelectedFocusNode = useGraphStore((state) => state.setSelectedFocusNode);
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const focusOptions = buildGraphSurfaceData(graphData).sourceNodes.filter((node) =>
    activeMode === "character" ? node.data.type === "character" : node.data.type === "event",
  );

  const [startChapter, setStartChapter] = useState(12);
  const [endChapter, setEndChapter] = useState(15);

  const handleStartChapterChange = useCallback((val: number) => {
    setStartChapter(Math.min(val, endChapter));
  }, [endChapter]);

  const handleEndChapterChange = useCallback((val: number) => {
    setEndChapter(Math.max(val, startChapter));
  }, [startChapter]);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-fg border-r border-border/30 overflow-hidden select-none min-w-0">
      {/* Compact header with mode toggle */}
      <div className="flex h-10 items-center justify-between border-b border-border/20 px-3 shrink-0 bg-element/30">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted truncate">
          {t("canvas.graph.scenarioAnalysis", "Graph")}
        </span>

        {/* Mode toggle inline */}
        <div className="flex items-center gap-px p-0.5 rounded-control bg-element border border-border/20">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => { setActiveMode("character"); setSelectedFocusNode("all"); }}
            className={cn(
              "rounded-control text-[10px] font-bold h-6 px-2.5 border-none cursor-pointer",
              activeMode === "character" ? "bg-accent text-on-accent" : "text-muted hover:text-fg bg-transparent",
            )}
          >
            <Users className="h-3 w-3 mr-1" />
            {t("canvas.graph.characterMode", "Character")}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => { setActiveMode("event"); setSelectedFocusNode("all"); }}
            className={cn(
              "rounded-control text-[10px] font-bold h-6 px-2.5 border-none cursor-pointer",
              activeMode === "event" ? "bg-accent text-on-accent" : "text-muted hover:text-fg bg-transparent",
            )}
          >
            <Calendar className="h-3 w-3 mr-1" />
            {t("canvas.graph.eventMode", "Event")}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 py-2 px-2.5 min-w-0">
        <div className="flex flex-col gap-3 min-w-0">
          {/* Chapter range — compact inline */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[9px] uppercase font-bold tracking-wider text-muted/70 pl-0.5">
              {t("canvas.graph.chapterRange", "Chapter Range")}
            </label>
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="relative min-w-0">
                <select
                  value={startChapter}
                  onChange={(e) => handleStartChapterChange(Number(e.target.value))}
                  aria-label={t("canvas.graph.startChapter", "시작 챕터")}
                  className="w-full rounded-control border border-border/30 pl-2.5 pr-6 py-1.5 text-[10px] font-bold cursor-pointer outline-none bg-element text-fg hover:bg-element-hover/80 transition-colors appearance-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <option value={12}>12{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={13}>13{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={14}>14{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={15}>15{t("canvas.graph.chapterUnit", "화")}</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <ChevronDown className="h-2.5 w-2.5" />
                </div>
              </div>

              <span className="text-[9px] text-muted/50 font-medium">—</span>

              <div className="relative min-w-0">
                <select
                  value={endChapter}
                  onChange={(e) => handleEndChapterChange(Number(e.target.value))}
                  aria-label={t("canvas.graph.endChapter", "끝 챕터")}
                  className="w-full rounded-control border border-border/30 pl-2.5 pr-6 py-1.5 text-[10px] font-bold cursor-pointer outline-none bg-element text-fg hover:bg-element-hover/80 transition-colors appearance-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <option value={12}>12{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={13}>13{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={14}>14{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={15}>15{t("canvas.graph.chapterUnit", "화")}</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <ChevronDown className="h-2.5 w-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Focus node selector */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[9px] uppercase font-bold tracking-wider text-muted/70 pl-0.5">
              {activeMode === "character"
                ? t("canvas.graph.characterFocus", "Focus Character")
                : t("canvas.graph.eventFocus", "Focus Event")}
            </label>
            <div className="relative min-w-0">
              <select
                value={selectedFocusNode}
                onChange={(e) => setSelectedFocusNode(e.target.value)}
                aria-label={
                  activeMode === "character"
                    ? t("canvas.graph.characterFocus", "Focus Character")
                    : t("canvas.graph.eventFocus", "Focus Event")
                }
                className="w-full rounded-control border border-border/30 pl-2.5 pr-7 py-1.5 text-[10px] font-bold cursor-pointer outline-none bg-element text-fg hover:bg-element-hover/80 transition-colors appearance-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="all">{t("canvas.graph.viewAllNetwork", "All")}</option>
                {focusOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.data.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
});

GraphFilterSidebar.displayName = "GraphFilterSidebar";
