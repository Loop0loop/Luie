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
  const { currentItem: currentProject, loadProjects } = useProjectStore();
  const { loadAll: loadChapters } = useChapterStore();
  const { loadSettings } = useEditorStore();
  const { loadCharacters } = useCharacterStore();
  const { loadTerms } = useTermStore();

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
