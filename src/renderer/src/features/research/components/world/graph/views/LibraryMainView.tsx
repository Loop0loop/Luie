import { useTranslation } from "react-i18next";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";
import { GraphPluginLibraryPanel } from "./GraphPluginLibraryPanel";
import { PlaceholderPluginPanel } from "./PlaceholderPluginPanel";

export function LibraryMainView() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((state) => state.currentItem);
  const activeLibraryTab = useGraphIdeStore((state) => state.activeLibraryTab);
  const activeLibrarySection = useGraphIdeStore((state) => state.activeLibrarySection);
  const attachmentPath = getReadableLuieAttachmentPath(currentProject);

  const getThemeVars = () => {
    switch (activeLibraryTab) {
      case "graph":
        return {
          gradient: "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]",
          text: "text-indigo-400"
        };
      case "timeline":
        return {
          gradient: "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.15),rgba(255,255,255,0))]",
          text: "text-sky-400"
        };
      case "note":
        return {
          gradient: "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(52,211,153,0.15),rgba(255,255,255,0))]",
          text: "text-emerald-400"
        };
      case "entity":
        return {
          gradient: "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(251,113,133,0.15),rgba(255,255,255,0))]",
          text: "text-rose-400"
        };
      default:
        return { gradient: "", text: "" };
    }
  };

  const theme = getThemeVars();

  return (
    <div className={`flex h-full flex-col overflow-hidden relative ${theme.gradient} transition-colors duration-500`}>
      {/* Decorative Grid Overlay for depth */}
      <div className="absolute inset-0 bg-[url('https://api.system/assets/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-[0.02] pointer-events-none" />

      <header className="relative flex shrink-0 items-center justify-between border-b border-white/5 px-8 py-6 z-10 backdrop-blur-md bg-background/40 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.5)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground drop-shadow-sm">
              {t("world.graph.library.title", "라이브러리")}
            </h1>
            <div className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-widest shadow-inner ${theme.text}`}>
              {activeLibraryTab} MODULES
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            모듈을 탐색하고 설치하여 월드 환경을 확장하세요.
          </p>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-muted-foreground shadow-inner backdrop-blur-md">
          <p className="font-medium text-foreground drop-shadow-sm">
            {currentProject?.title ?? t("world.graph.library.noProject", "프로젝트 없음")}
          </p>
          <p className="mt-1 opacity-80">
            {attachmentPath
              ? t("world.graph.library.attachment", { defaultValue: `.luie 첨부: ${attachmentPath}` })
              : t("world.graph.library.replicaOnly", "현재 기기 저장소 기준으로 표시 중")}
          </p>
        </div>
      </header>

      <ScrollArea className="relative flex-1 px-8 py-8 z-10" style={{ height: "100%" }}>
        <div className="mx-auto max-w-5xl space-y-8 pb-16">
          {activeLibraryTab === "graph" ? (
            <GraphPluginLibraryPanel projectId={currentProject?.id ?? null} />
          ) : (
            <PlaceholderPluginPanel activeTab={activeLibraryTab} activeSection={activeLibrarySection} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
