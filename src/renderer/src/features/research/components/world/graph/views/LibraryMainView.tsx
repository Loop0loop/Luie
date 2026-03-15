import { useTranslation } from "react-i18next";
import { Archive, Network, PackageOpen } from "lucide-react";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";
import { GraphPluginLibraryPanel } from "./GraphPluginLibraryPanel";

export function LibraryMainView() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((state) => state.currentItem);
  const attachmentPath = getReadableLuieAttachmentPath(currentProject);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#0A0A0A] text-foreground">
      {/* Background gradients for premium feel */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.04),transparent_50%)]" />

      <header className="relative z-10 shrink-0 border-b border-white/5 bg-[#0A0A0A]/80 px-10 py-10 backdrop-blur-xl">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between max-w-[1400px] mx-auto w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-sky-400">
              <Archive className="h-3.5 w-3.5" />
              Graph Plugin Library
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white drop-shadow-sm">
              {t("world.graph.library.title", "라이브러리")}
            </h1>
            <div className="mt-4 space-y-1.5 text-[15px] leading-relaxed text-muted-foreground/80 font-medium">
              <p>GitHub 릴리스 번들을 설치하고 월드 그래프 템플릿을 현재 프로젝트에 적용합니다.</p>
              <p>설치 범위는 앱 전역이며 적용 시 현재 그래프 레이아웃을 교체합니다.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[34rem] self-start mt-2 xl:mt-0 relative">
            {/* Action buttons (mockup shows them floating above/near the widgets) */}
            <div className="absolute -top-12 right-0 flex gap-2 hidden xl:flex">
                <button className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors">설정</button>
                <button className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors">사용법</button>
            </div>
            
            <div className="rounded-[16px] border border-white/5 bg-white/[0.02] px-5 py-5 shadow-sm transition-colors hover:border-white/10 hover:bg-white/[0.04]">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-sky-400">
                <Network className="h-3.5 w-3.5" />
                Active Project
              </div>
              <p className="mt-4 truncate text-[17px] font-semibold text-white drop-shadow-sm">
                {currentProject?.title ?? t("world.graph.library.noProject", "프로젝트 없음")}
              </p>
              <p className="border-t border-white/5 pt-3 mt-3 text-[12px] leading-relaxed text-muted-foreground/70">
                {attachmentPath
                  ? `.luie 첨부:\n${attachmentPath}`
                  : t("world.graph.library.replicaOnly", "현재 기기 저장소 기준으로 표시 중")}
              </p>
            </div>
            <div className="rounded-[16px] border border-white/5 bg-white/[0.02] px-5 py-5 shadow-sm transition-colors hover:border-white/10 hover:bg-white/[0.04]">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-fuchsia-400">
                <PackageOpen className="h-3.5 w-3.5" />
                Install Scope
              </div>
              <p className="mt-4 text-[17px] font-semibold text-white drop-shadow-sm">
                앱 전역 설치
              </p>
              <p className="border-t border-white/5 pt-3 mt-3 text-[12px] leading-relaxed text-muted-foreground/70">
                설치된 플러그인은 다른 프로젝트에서도 바로 사용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </header>

      <ScrollArea className="relative z-10 flex-1">
        {/* Added a max-width and centered the container */}
        <div className="mx-auto w-full max-w-[1400px] px-10 py-10 relative">
          <GraphPluginLibraryPanel projectId={currentProject?.id ?? null} />
        </div>
      </ScrollArea>
    </div>
  );
}
