import { Suspense, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useEditorStore } from "@renderer/domains/editor";
import { useProjectStore } from "@renderer/domains/project";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { setChapterContent } from "@renderer/features/manuscript/stores/chapterContentStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import {
  DocsSidebar,
  EditorLayout,
  GoogleDocsLayout,
  MainLayout,
  ScrivenerLayout,
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

// 위저드 프리뷰에 최적화된 컴팩트 사이드바 및 패널 규격 (사이드바 16~18%, 패널 20~25%로 본문 공간 75%+ 확보)
const WIZARD_PREVIEW_SIDEBAR_WIDTHS: Record<string, number> = {
  mainSidebar: 210,
  docsBinder: 210,
  binder: 210,
  scrivenerBinder: 200,
  characterSidebar: 200,
  eventSidebar: 200,
  factionSidebar: 200,
  memoSidebar: 200,
  worldGraphSidebar: 200,
  scrivenerInspector: 260,
  mainContext: 280,
  docsCharacter: 280,
  docsEvent: 280,
  docsFaction: 280,
  docsWorld: 280,
  docsScrap: 280,
  docsAnalysis: 280,
  docsSnapshot: 280,
  docsTrash: 280,
  docsEditor: 280,
  docsExport: 280,
  editorCharacter: 280,
  editorEvent: 280,
  editorFaction: 280,
  editorWorld: 280,
  editorScrap: 280,
  editorAnalysis: 280,
  editorSnapshot: 280,
  editorTrash: 280,
  editorCanvas: 280,
  character: 280,
  event: 280,
  faction: 280,
  world: 280,
  scrap: 280,
  analysis: 280,
  snapshot: 280,
  trash: 280,
  memo: 280,
  editor: 280,
  export: 280,
  context: 280,
  inspector: 260,
};

const WIZARD_PREVIEW_SURFACE_RATIOS: Record<string, number> = {
  "default.sidebar": 16,
  "default.panel": 24,
  "docs.sidebar": 16,
  "docs.panel.research": 25,
  "docs.panel.analysis": 25,
  "docs.panel.snapshot": 22,
  "docs.panel.trash": 20,
  "docs.panel.editor": 25,
  "docs.panel.export": 25,
  "scrivener.binder": 16,
  "scrivener.inspector": 20,
  "editor.panel.research": 25,
  "editor.panel.analysis": 25,
  "editor.panel.snapshot": 22,
  "editor.panel.trash": 20,
  "editor.panel.canvas": 25,
  "canvas.activity": 16,
  "canvas.binder": 16,
};

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

    // 위저드 프리뷰에 최적화된 컴팩트 사이드바, 리서치/인스펙터 패널 규격 및 surface ratios 주입
    const currentUiStore = useUIStore.getState();
    const currentRegions = currentUiStore.regions;
    const compactWidthByTab = Object.keys(
      currentRegions.rightPanel.widthByTab,
    ).reduce(
      (acc, key) => ({ ...acc, [key]: 280 }),
      {} as typeof currentRegions.rightPanel.widthByTab,
    );

    const isScrivener = uiMode === "scrivener";
    useUIStore.setState({
      sidebarWidths: {
        ...currentUiStore.sidebarWidths,
        ...WIZARD_PREVIEW_SIDEBAR_WIDTHS,
      },
      layoutSurfaceRatios: {
        ...currentUiStore.layoutSurfaceRatios,
        ...WIZARD_PREVIEW_SURFACE_RATIOS,
      },
      regions: {
        ...currentRegions,
        leftSidebar: { ...currentRegions.leftSidebar, open: true, widthPx: 210 },
        rightPanel: {
          ...currentRegions.rightPanel,
          open: isScrivener,
          activeTab: null,
          widthByTab: compactWidthByTab,
        },
      },
      panels: [],
    });
  }

  // 스크리브너 모드일 때는 3단 뷰(인스펙터)를 열고, 다른 레이아웃은 본문 집중을 위해 닫는다.
  const isScrivener = uiMode === "scrivener";
  if (useUIStore.getState().regions.rightPanel.open !== isScrivener) {
    useUIStore.setState((state) => ({
      regions: {
        ...state.regions,
        rightPanel: {
          ...state.regions.rightPanel,
          open: isScrivener,
        },
      },
    }));
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
            <DocsSidebar />
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
