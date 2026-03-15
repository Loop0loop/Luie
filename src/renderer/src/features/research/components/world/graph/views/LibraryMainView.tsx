import { useTranslation } from "react-i18next";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";
import { GraphPluginLibraryPanel } from "./GraphPluginLibraryPanel";

export function LibraryMainView() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((state) => state.currentItem);
  const attachmentPath = getReadableLuieAttachmentPath(currentProject);

  return (
    <div className="flex h-full flex-col bg-transparent overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("world.graph.library.title", "라이브러리")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            모듈을 탐색하고 설치하여 월드 환경을 확장하세요.
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

      <ScrollArea className="flex-1 px-8 py-8" style={{ height: "100%" }}>
        <div className="mx-auto max-w-5xl space-y-8 pb-16">

          <GraphPluginLibraryPanel projectId={currentProject?.id ?? null} />
        </div>
      </ScrollArea>
    </div>
  );
}
