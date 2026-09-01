import { useEffect } from "react";
import { api } from "@shared/api";
import { createPerformanceTimer } from "@shared/logger";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";

export function useProjectInit(enabled = true) {
  const currentProject = useProjectStore((state) => state.currentItem);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const loadChapters = useChapterStore((state) => state.loadAll);
  const loadSettings = useEditorStore((state) => state.loadSettings);
  const loadCharacters = useCharacterStore((state) => state.loadCharacters);
  const loadEvents = useEventStore((state) => state.loadEvents);
  const loadFactions = useFactionStore((state) => state.loadFactions);
  const loadTerms = useTermStore((state) => state.loadTerms);

  useEffect(() => {
    if (!enabled) return;
    const timer = createPerformanceTimer({
      scope: "project-init",
      event: "project-init.startup-loads",
    });

    void Promise.allSettled([loadProjects(), loadSettings()])
      .then((results) => {
        const rejected = results.filter((result) => result.status === "rejected");
        if (rejected.length > 0) {
          const reason = rejected[0]?.status === "rejected" ? rejected[0].reason : null;
          timer.fail(api.logger, reason, {
            rejectedCount: rejected.length,
          });
          return;
        }

        timer.complete(api.logger, {
          rejectedCount: 0,
        });
      });
  }, [enabled, loadProjects, loadSettings]);

  useEffect(() => {
    if (!enabled || !currentProject) return;
    const timer = createPerformanceTimer({
      scope: "project-init",
      event: "project-init.project-switch-loads",
      meta: {
        projectId: currentProject.id,
      },
    });

    // NOTE: 네 종류를 전부 여기서 로드한다. 세력·사건은 Scrivener 사이드바 섹션이나
    // 캔버스 진입 시에만 로드됐는데, 에디터 스마트링크는 이 네 스토어 전부를 데이터
    // 소스로 삼으므로 레이아웃에 따라 하이라이트 대상이 달라지는 문제가 있었다.
    void Promise.allSettled([
      loadChapters(currentProject.id),
      loadCharacters(currentProject.id),
      loadEvents(currentProject.id),
      loadFactions(currentProject.id),
      loadTerms(currentProject.id),
    ]).then((results) => {
      const rejected = results.filter((result) => result.status === "rejected");
      if (rejected.length > 0) {
        const reason = rejected[0]?.status === "rejected" ? rejected[0].reason : null;
        timer.fail(api.logger, reason, {
          projectId: currentProject.id,
          rejectedCount: rejected.length,
        });
        return;
      }

      timer.complete(api.logger, {
        projectId: currentProject.id,
        rejectedCount: 0,
      });
    });
  }, [enabled, currentProject, loadChapters, loadCharacters, loadEvents, loadFactions, loadTerms]);

  return { currentProject };
}
