/**
 * 프로젝트 초기화 및 로딩 로직
 */

import { useEffect } from "react";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore } from "../stores/chapterStore";
import { useEditorStore } from "../stores/editorStore";
import { useCharacterStore } from "../stores/characterStore";
import { useTermStore } from "../stores/termStore";

export function useProjectInit() {
  const currentProject = useProjectStore((state) => state.currentItem);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const loadChapters = useChapterStore((state) => state.loadAll);
  const loadSettings = useEditorStore((state) => state.loadSettings);
  const loadCharacters = useCharacterStore((state) => state.loadCharacters);
  const loadTerms = useTermStore((state) => state.loadTerms);

  // 앱 시작 시 프로젝트 & 설정 로드
  useEffect(() => {
    loadProjects();
    loadSettings();
  }, [loadProjects, loadSettings]);

  // 현재 프로젝트 변경 시 챕터 로드
  useEffect(() => {
    if (currentProject) {
      loadChapters(currentProject.id);
      loadCharacters(currentProject.id);
      loadTerms(currentProject.id);
    }
  }, [currentProject, loadChapters, loadCharacters, loadTerms]);

  return { currentProject };
}
