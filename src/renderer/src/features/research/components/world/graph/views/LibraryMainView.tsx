import { Archive, ArrowRight, BookOpenText, Boxes, CalendarRange, LibraryBig, Map, Network, NotebookPen, Route } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { useWorldLibrarySummary } from "../hooks/useWorldLibrarySummary";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";
import type { LibrarySummaryEntryId } from "../utils/worldGraphIdeViewModels";

const ENTRY_ICONS: Record<LibrarySummaryEntryId, typeof Network> = {
  graph: Network,
  timeline: CalendarRange,
  notes: NotebookPen,
  entity: Boxes,
  synopsis: BookOpenText,
  plot: Route,
  drawing: Map,
  mindmap: LibraryBig,
};

export function LibraryMainView() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((state) => state.currentItem);
  const setActiveTab = useGraphIdeStore((state) => state.setActiveTab);
  const setWorldTab = useUIStore((state) => state.setWorldTab);
  const { entries, error, isLoading } = useWorldLibrarySummary();
  const attachmentPath = getReadableLuieAttachmentPath(currentProject);

  const handleOpenEntry = (entryId: LibrarySummaryEntryId) => {
    switch (entryId) {
      case "graph":
      case "timeline":
      case "entity":
        setActiveTab(entryId);
        return;
      case "notes":
        setActiveTab("note");
        return;
      case "synopsis":
      case "plot":
      case "drawing":
      case "mindmap":
        setWorldTab(entryId);
        return;
    }
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <header className="flex items-center justify-between border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("world.graph.library.title", "라이브러리")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            현재 프로젝트에 실제로 저장된 그래프/문서만 보여줍니다.
          </p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            {currentProject?.title ?? t("world.graph.library.noProject", "프로젝트 없음")}
          </p>
          <p className="mt-1">
            {attachmentPath
              ? t("world.graph.library.attachment", { defaultValue: `.luie 첨부: ${attachmentPath}` })
              : t("world.graph.library.replicaOnly", "현재 기기 저장소 기준으로 표시 중")}
          </p>
        </div>
      </header>

      <ScrollArea className="flex-1 px-8 py-8">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("world.graph.library.loading", "문서 상태를 불러오는 중입니다...")}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => {
              const Icon = ENTRY_ICONS[entry.id] ?? Archive;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleOpenEntry(entry.id)}
                  className="group flex flex-col rounded-2xl border bg-card p-5 text-left shadow-sm transition-all hover:border-accent/40 hover:bg-accent/5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{entry.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{entry.badge}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {entry.description}
                  </p>

                  <div className="mt-5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    {entry.updatedAt
                      ? t("world.graph.library.updatedAt", {
                          defaultValue: `최근 갱신: ${entry.updatedAt}`,
                        })
                      : t("world.graph.library.openHint", "클릭하면 해당 작업 공간으로 이동합니다.")}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
