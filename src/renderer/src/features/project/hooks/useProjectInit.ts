/**
 * 프로젝트 초기화 및 로딩 로직
 */

import { useEffect } from "react";
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

  // 앱 시작 시 프로젝트 & 설정 로드
  useEffect(() => {
    if (!enabled) return;
    void loadProjects();
    void loadSettings();
  }, [enabled, loadProjects, loadSettings]);

  // 현재 프로젝트 변경 시 챕터 로드
  useEffect(() => {
    if (!enabled || !currentProject) return;
    void loadChapters(currentProject.id);
    void loadCharacters(currentProject.id);
    void loadTerms(currentProject.id);
  }, [enabled, currentProject, loadChapters, loadCharacters, loadTerms]);

  return { currentProject };
}
