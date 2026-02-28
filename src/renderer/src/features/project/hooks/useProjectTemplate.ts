/**
 * 프로젝트 템플릿 선택 및 생성
 */

import { useCallback } from "react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { api } from "@shared/api";
import { i18n } from "@renderer/i18n";
import { initializeTemplateProject } from "./projectTemplateInitialization";

export function useProjectTemplate(setActiveChapterId: (id: string) => void) {
  const { createProject, setCurrentProject, deleteProject, updateProject } = useProjectStore();
  const { create: createChapter } = useChapterStore();
  const { setView } = useUIStore();

  const handleSelectProject = useCallback(
    async (templateId: string, projectPath: string) => {
      let projectTitle = i18n.t("project.defaults.projectTitle");

      switch (templateId) {
        case "blank":
          projectTitle = i18n.t("project.defaults.newProjectTitle");
          break;
        case "novel_basic":
          projectTitle = i18n.t("settings.projectTemplate.title.webNovel");
          break;
        case "script_basic":
          projectTitle = i18n.t("settings.projectTemplate.title.screenplay");
          break;
        case "essay":
          projectTitle = i18n.t("settings.projectTemplate.title.essay");
          break;
      }

      const description = i18n.t("project.templateDescription", { templateId });

      const newProject = await createProject(
        projectTitle,
        description,
        projectPath,
      );

      if (newProject) {
        const initialized = await initializeTemplateProject(
          {
            project: {
              id: newProject.id,
              title: newProject.title,
              createdAt: newProject.createdAt,
              updatedAt: newProject.updatedAt,
            },
            projectPath,
            templateId,
            defaultChapterTitle: i18n.t("project.defaults.chapterTitle"),
          },
          {
            fs: {
              createLuiePackage: api.fs.createLuiePackage,
              writeProjectFile: api.fs.writeProjectFile,
              writeFile: api.fs.writeFile,
            },
            createChapter,
            deleteProject,
            logger: api.logger,
          },
        );

        if (!initialized) {
          return;
        }

        let currentProject = newProject;
        const normalizedProjectPath = initialized.projectPath;
        if (
          typeof normalizedProjectPath === "string" &&
          normalizedProjectPath.length > 0 &&
          normalizedProjectPath !== (newProject.projectPath ?? "")
        ) {
          await updateProject(newProject.id, undefined, undefined, normalizedProjectPath);
          currentProject = {
            ...newProject,
            projectPath: normalizedProjectPath,
          };
        }

        setCurrentProject(currentProject);
        setActiveChapterId(initialized.chapterId);
        setView("editor");
      }
    },
    [createProject, setCurrentProject, deleteProject, updateProject, createChapter, setView, setActiveChapterId],
  );

  return { handleSelectProject };
}
