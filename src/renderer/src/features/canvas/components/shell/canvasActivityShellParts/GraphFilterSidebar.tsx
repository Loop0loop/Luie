import { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronDown, Users, Workflow } from "lucide-react";
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
  const selectedChapterFilter = useGraphStore((state) => state.selectedChapterFilter);
  const setSelectedChapterFilter = useGraphStore((state) => state.setSelectedChapterFilter);
  const selectedFocusNode = useGraphStore((state) => state.selectedFocusNode);
  const setSelectedFocusNode = useGraphStore((state) => state.setSelectedFocusNode);
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const focusOptions = buildGraphSurfaceData(graphData).sourceNodes.filter((node) =>
    activeMode === "character" ? node.data.type === "character" : node.data.type === "event",
  );

  const [startChapter, setStartChapter] = useState(12);
  const [endChapter, setEndChapter] = useState(15);

  const handleStartChapterChange = useCallback((val: number) => {
    const nextStart = Math.min(val, endChapter);
    setStartChapter(nextStart);

    if (nextStart === 12 && endChapter === 13) {
      setSelectedChapterFilter("early");
    } else {
      setSelectedChapterFilter("all");
    }
  }, [endChapter, setSelectedChapterFilter]);

  const handleEndChapterChange = useCallback((val: number) => {
    const nextEnd = Math.max(val, startChapter);
    setEndChapter(nextEnd);

    if (startChapter === 12 && nextEnd === 13) {
      setSelectedChapterFilter("early");
    } else {
      setSelectedChapterFilter("all");
    }
  }, [startChapter, setSelectedChapterFilter]);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground border-r border-border/20 overflow-hidden select-none min-w-0">
      <div className="flex h-13 items-center justify-between border-b border-border/20 px-4.5 shrink-0 bg-element/10 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Workflow className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="text-[11px] font-black tracking-widest text-fg uppercase truncate">
            {t("canvas.graph.scenarioAnalysis", "관계 시나리오 분석")}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4.5 bg-sidebar/20 min-w-0">
        <div className="flex flex-col gap-6 min-w-0">
          <div className="flex flex-col gap-2.5 min-w-0">
            <label className="text-[9.5px] uppercase font-black tracking-widest text-muted pl-0.5">
              {t("canvas.graph.analysisMode", "시나리오 분석 모드")}
            </label>
            <div className="flex items-center gap-1.5 p-1 rounded-panel bg-element border border-border/20 h-auto py-1 min-w-0 shadow-inner flex-wrap">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setActiveMode("character");
                  setSelectedFocusNode("all");
                }}
                className={cn(
                  "flex-1 shrink-0 min-w-[75px] flex items-center justify-center gap-1.5 rounded-panel text-[10px] font-extrabold h-8 cursor-pointer border-none transition-colors duration-200",
                  activeMode === "character"
                    ? "bg-panel text-accent border border-border hover:bg-panel"
                    : "text-muted hover:bg-element-hover/50 hover:text-fg bg-transparent",
                )}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("canvas.graph.characterMap", "인물 관계도")}</span>
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setActiveMode("event");
                  setSelectedFocusNode("all");
                }}
                className={cn(
                  "flex-1 shrink-0 min-w-[75px] flex items-center justify-center gap-1.5 rounded-panel text-[10px] font-extrabold h-8 cursor-pointer border-none transition-colors duration-200",
                  activeMode === "event"
                    ? "bg-panel text-accent border border-border hover:bg-panel"
                    : "text-muted hover:bg-element-hover/50 hover:text-fg bg-transparent",
                )}
              >
                <Workflow className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("canvas.graph.eventFlow", "사건 타임라인")}</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 min-w-0">
            <label className="text-[9.5px] uppercase font-black tracking-widest text-muted pl-0.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted/80" />
              {t("canvas.graph.chapterRange", "에피소드/챕터 범위")}
            </label>
            <div className="flex items-center gap-1.5 p-1 rounded-panel bg-element border border-border/20 h-auto py-1 min-w-0 shadow-inner flex-wrap">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setSelectedChapterFilter("all");
                  setStartChapter(12);
                  setEndChapter(15);
                }}
                className={cn(
                  "flex-1 shrink-0 min-w-[85px] flex items-center justify-center rounded-panel text-[9.5px] font-extrabold h-8 cursor-pointer border-none transition-colors duration-200",
                  selectedChapterFilter === "all"
                    ? "bg-panel text-accent border border-border hover:bg-panel"
                    : "text-muted hover:bg-element-hover/50 hover:text-fg bg-transparent",
                )}
              >
                <span className="truncate">{t("canvas.graph.allChapters", "전체 챕터 (12~15화)")}</span>
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setSelectedChapterFilter("early");
                  setStartChapter(12);
                  setEndChapter(13);
                }}
                className={cn(
                  "flex-1 shrink-0 min-w-[85px] flex items-center justify-center rounded-panel text-[9.5px] font-extrabold h-8 cursor-pointer border-none transition-colors duration-200",
                  selectedChapterFilter === "early"
                    ? "bg-panel text-accent border border-border hover:bg-panel"
                    : "text-muted hover:bg-element-hover/50 hover:text-fg bg-transparent",
                )}
              >
                <span className="truncate">{t("canvas.graph.earlyChapters", "초반 시나리오")}</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 min-w-0">
            <label className="text-[9.5px] uppercase font-black tracking-widest text-muted pl-0.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted/80" />
              {t("canvas.graph.rangeControlLabel", "집필 회차 미세 조정")}
            </label>
            <div className="grid grid-cols-2 gap-2 min-w-0">
              <div className="relative min-w-0">
                <select
                  value={startChapter}
                  onChange={(e) => handleStartChapterChange(Number(e.target.value))}
                  aria-label={t("canvas.graph.startChapter", "시작 챕터")}
                  className="w-full rounded-panel border border-border/20 pl-3 pr-7 py-2.5 text-[11px] font-extrabold cursor-pointer outline-none bg-element text-fg hover:bg-element-hover/80 transition-colors appearance-none shadow-sm min-w-0 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <option value={12}>12{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={13}>13{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={14}>14{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={15}>15{t("canvas.graph.chapterUnit", "화")}</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>

              <div className="relative min-w-0">
                <select
                  value={endChapter}
                  onChange={(e) => handleEndChapterChange(Number(e.target.value))}
                  aria-label={t("canvas.graph.endChapter", "끝 챕터")}
                  className="w-full rounded-panel border border-border/20 pl-3 pr-7 py-2.5 text-[11px] font-extrabold cursor-pointer outline-none bg-element text-fg hover:bg-element-hover/80 transition-colors appearance-none shadow-sm min-w-0 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <option value={12}>12{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={13}>13{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={14}>14{t("canvas.graph.chapterUnit", "화")}</option>
                  <option value={15}>15{t("canvas.graph.chapterUnit", "화")}</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 min-w-0">
            <label className="text-[9.5px] uppercase font-black tracking-widest text-muted pl-0.5">
              {activeMode === "character" ? t("canvas.graph.characterFocus", "인물 집중 추적") : t("canvas.graph.eventFocus", "특정 사건 추적")}
            </label>
            <div className="relative min-w-0">
              <select
                value={selectedFocusNode}
                onChange={(e) => setSelectedFocusNode(e.target.value)}
                aria-label={activeMode === "character" ? t("canvas.graph.characterFocus", "인물 집중 추적") : t("canvas.graph.eventFocus", "특정 사건 추적")}
                className="w-full rounded-panel border border-border/20 px-3.5 py-2.5 text-[11.5px] font-extrabold cursor-pointer outline-none bg-element text-fg hover:bg-element-hover/80 transition-colors appearance-none pr-8.5 shadow-sm min-w-0 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="all">{t("canvas.graph.viewAllNetwork", "전체 연결망 보기")}</option>
                {focusOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.data.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
});

GraphFilterSidebar.displayName = "GraphFilterSidebar";
