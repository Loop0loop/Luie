/**
 * 프로젝트 초기화 및 로딩 로직
 */

import { useEffect } from "react";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore } from "../stores/chapterStore";
import { useEditorStore } from "../stores/editorStore";

export function useProjectInit() {
  const { currentItem: currentProject, loadProjects } = useProjectStore();
  const { loadAll: loadChapters } = useChapterStore();
  const { loadSettings } = useEditorStore();

  // 앱 시작 시 프로젝트 & 설정 로드
  useEffect(() => {
    loadProjects();
    loadSettings();
  }, [loadProjects, loadSettings]);

  // 현재 프로젝트 변경 시 챕터 로드
  useEffect(() => {
    if (currentProject) {
      loadChapters(currentProject.id);
    }
  }, [currentProject, loadChapters]);

  return { currentProject };
}
