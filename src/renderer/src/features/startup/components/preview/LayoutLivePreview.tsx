import { Suspense, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useEditorStore } from "@renderer/domains/editor";
import { useProjectStore } from "@renderer/domains/project";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { setChapterContent } from "@renderer/features/manuscript/stores/chapterContentStore";
import {
  DocsSidebar,
  EditorLayout,
  GoogleDocsLayout,
  MainLayout,
  ScrivenerLayout,
  ScrivenerSidebar,
  Sidebar,
} from "@renderer/features/workspace/components/layout/rootShell";
import {
  PREVIEW_ACTIVE_CHAPTER_ID,
  PREVIEW_CHAPTERS,
  PREVIEW_PROJECT,
  PREVIEW_PROJECT_ID,
  SAMPLE_CONTENT,
} from "../../constants/previewData";
import type { LayoutChoice } from "../../types/wizard";
import { WizardEditor } from "./WizardEditor";

const noop = () => {};

let isPreviewWorkspaceSeeded = false;

const syncPreviewWorkspace = (uiMode: LayoutChoice): void => {
  if (!isPreviewWorkspaceSeeded) {
    isPreviewWorkspaceSeeded = true;
    // CRUD 슬라이스의 별칭 키(projects/currentProject, chapters/currentChapter)를
    // 함께 채워야 모든 구독자가 같은 값을 본다.
    useProjectStore.setState({
      items: [PREVIEW_PROJECT],
      projects: [PREVIEW_PROJECT],
      currentItem: PREVIEW_PROJECT,
      currentProject: PREVIEW_PROJECT,
    });
    useChapterStore.setState({
      items: PREVIEW_CHAPTERS,
      chapters: PREVIEW_CHAPTERS,
      currentItem: PREVIEW_CHAPTERS[0] ?? null,
      currentChapter: PREVIEW_CHAPTERS[0] ?? null,
    });
    setChapterContent(PREVIEW_ACTIVE_CHAPTER_ID, SAMPLE_CONTENT);
  }
  // EditorDropZones처럼 스토어의 uiMode를 직접 읽는 컴포넌트가 미리 보기 모드를
  // 따르게 한다. editorStore는 persist가 없어 메모리에만 반영된다.
  if (useEditorStore.getState().uiMode !== uiMode) {
    useEditorStore.setState({ uiMode });
  }
};

interface LayoutLivePreviewProps {
  uiMode: LayoutChoice;
}

/** 선택한 레이아웃의 실제 컴포넌트 풀블리드. 레이아웃 루트가 h-screen 기준이라
 * 박스에 넣으면 하단이 잘리므로 창 전체를 차지하게 마운트한다(WorkspaceLayoutRouter와
 * 같은 조합: 레이아웃 셸 + 실제 사이드바/바인더 + 진짜 Editor). */
export function LayoutLivePreview({ uiMode }: LayoutLivePreviewProps) {
  syncPreviewWorkspace(uiMode);
  const [docEditor, setDocEditor] = useState<TiptapEditor | null>(null);
  const activeChapter = PREVIEW_CHAPTERS[0];

  if (uiMode === "docs") {
    return (
      <GoogleDocsLayout
        sidebar={
          <Suspense fallback={null}>
            <DocsSidebar />
          </Suspense>
        }
        activeChapterId={activeChapter?.id}
        activeChapterTitle={activeChapter?.title}
        currentProjectId={PREVIEW_PROJECT_ID}
        editor={docEditor}
        onOpenSettings={noop}
      >
        <WizardEditor uiMode="docs" onReady={setDocEditor} />
      </GoogleDocsLayout>
    );
  }
  if (uiMode === "editor") {
    return (
      <EditorLayout
        sidebar={
          <Suspense fallback={null}>
            <DocsSidebar />
          </Suspense>
        }
        activeChapterId={activeChapter?.id}
        activeChapterTitle={activeChapter?.title}
        currentProjectId={PREVIEW_PROJECT_ID}
        editor={docEditor}
        onOpenSettings={noop}
      >
        <WizardEditor uiMode="editor" onReady={setDocEditor} />
      </EditorLayout>
    );
  }
  if (uiMode === "scrivener") {
    return (
      <ScrivenerLayout
        sidebar={
          <Suspense fallback={null}>
            <ScrivenerSidebar currentProjectId={PREVIEW_PROJECT_ID} />
          </Suspense>
        }
        activeChapterId={activeChapter?.id}
        activeChapterTitle={activeChapter?.title}
        editor={docEditor}
        onOpenSettings={noop}
      >
        <WizardEditor uiMode="scrivener" onReady={setDocEditor} />
      </ScrivenerLayout>
    );
  }
  return (
    <MainLayout
      sidebar={
        <Suspense fallback={null}>
          <Sidebar onOpenSettings={noop} onSelectResearchItem={noop} />
        </Suspense>
      }
    >
      <WizardEditor uiMode="default" onReady={setDocEditor} />
    </MainLayout>
  );
}
