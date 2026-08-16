import { useEffect } from "react";
import { api } from "@shared/api";
import { createPerformanceTimer } from "@shared/logger";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";

export function useProjectInit(enabled = true) {
  const currentProject = useProjectStore((state) => state.currentItem);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const loadChapters = useChapterStore((state) => state.loadAll);
  const loadSettings = useEditorStore((state) => state.loadSettings);
  const loadCharacters = useCharacterStore((state) => state.loadCharacters);
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

    void Promise.allSettled([
      loadChapters(currentProject.id),
      loadCharacters(currentProject.id),
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
  }, [enabled, currentProject, loadChapters, loadCharacters, loadTerms]);

  return { currentProject };
}
