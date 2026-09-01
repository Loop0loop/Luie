// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Editor from "../../src/renderer/src/features/editor/components/Editor.js";

/**
 * 에디터가 기존 본문으로 생성될 때(앱 시작, 원고 전환, 스냅샷 복원) onUpdate가
 * 발화하지 않는다. onCreate에서 초기 통계를 계산하는 배선이 없으면 StatusFooter는
 * 첫 타이핑 전까지 0 | 0(또는 이전 원고 값)으로 남는다.
 */
const mocked = vi.hoisted(() => {
  const editor = {
    getHTML: vi.fn(() => "<p>Hello world</p>"),
    getText: vi.fn(() => "Hello world"),
    commands: {
      setContent: vi.fn(),
      setDiff: vi.fn(),
      focus: vi.fn(),
      setTextSelection: vi.fn(),
    },
    state: {
      selection: { from: 1, to: 1 },
      doc: {
        resolve: vi.fn(() => ({
          nodeAfter: null,
          nodeBefore: null,
          parent: { textContent: "" },
        })),
        textBetween: vi.fn(() => ""),
      },
      tr: { scrollIntoView: vi.fn() },
    },
    view: { dispatch: vi.fn() },
  };

  return {
    editor,
    useEditor: vi.fn(() => editor),
    updateStats: vi.fn(),
  };
});

vi.mock("@tiptap/react", () => ({
  useEditor: mocked.useEditor,
  EditorContent: () => <div data-testid="editor-content-mock" />,
}));

vi.mock(
  "../../src/renderer/src/features/editor/components/EditorBubbleMenu.js",
  () => ({ default: () => null }),
);

vi.mock(
  "../../src/renderer/src/features/editor/components/EditorToolbar.js",
  () => ({ default: () => null }),
);

vi.mock(
  "../../src/renderer/src/features/editor/hooks/useBufferedInput.js",
  () => ({
    useBufferedInput: (initialValue: string) => ({
      value: initialValue,
      onChange: vi.fn(),
      reset: vi.fn(),
    }),
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/hooks/useEditorAutosave.js",
  () => ({ useEditorAutosave: vi.fn() }),
);

vi.mock(
  "../../src/renderer/src/features/editor/hooks/useEditorStats.js",
  () => ({
    useEditorStats: () => ({ updateStats: mocked.updateStats }),
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/hooks/useEditorConfig.js",
  () => ({
    useEditorConfig: () => ({
      fontFamilyCss: "Inter",
      fontSize: 16,
      lineHeight: 1.7,
      letterSpacing: 0,
      wordSpacing: 0,
      paragraphSpacing: 1,
      getFontFamily: () => "Inter",
    }),
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/hooks/useEditorScrollRestoration.js",
  () => ({ useEditorScrollRestoration: vi.fn() }),
);

vi.mock(
  "../../src/renderer/src/features/editor/components/hooks/useEditorExtensions.js",
  () => ({ useEditorExtensions: () => [] }),
);

vi.mock(
  "../../src/renderer/src/features/editor/components/hooks/useSmartLinkClickHandler.js",
  () => ({ useSmartLinkClickHandler: () => vi.fn() }),
);

vi.mock(
  "../../src/renderer/src/features/editor/components/hooks/useTypewriterScroll.js",
  () => ({ useTypewriterScroll: vi.fn() }),
);

vi.mock(
  "../../src/renderer/src/features/workspace/services/exportEntryService.js",
  () => ({ openQuickExportEntry: vi.fn() }),
);

vi.mock(
  "../../src/renderer/src/features/workspace/services/chapterNavigation.js",
  () => ({ consumePendingEditorFocusQuery: vi.fn(() => null) }),
);

vi.mock(
  "../../src/renderer/src/features/workspace/utils/EditorSyncBus.js",
  () => ({
    EditorSyncBus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
  }),
);

vi.mock("../../src/renderer/src/features/editor/stores/editorStore.js", () => ({
  useEditorStore: (selector: (state: { entityColors: null; maxWidth: number }) => unknown) =>
    selector({ entityColors: null, maxWidth: 800 }),
}));

vi.mock(
  "../../src/renderer/src/features/research/stores/characterStore.js",
  () => ({ useCharacterStore: { getState: () => ({ characters: [] }) } }),
);

vi.mock("../../src/renderer/src/features/research/stores/termStore.js", () => ({
  useTermStore: { getState: () => ({ terms: [] }) },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@shared/ui/useDialog", () => ({
  useDialog: () => ({ toast: vi.fn() }),
}));

vi.mock("@shared/ui/StatusFooter", () => ({ default: () => null }));

describe("Editor 초기 본문 통계 계산", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocked.useEditor.mockClear();
    mocked.updateStats.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = "";
  });

  it("onCreate가 초기 본문 텍스트로 updateStats를 호출한다", () => {
    act(() => {
      root.render(<Editor chapterId="chapter-1" initialContent="<p>Hello world</p>" />);
    });

    const options = mocked.useEditor.mock.calls[0]?.[0] as
      | { onCreate?: (context: { editor: typeof mocked.editor }) => void }
      | undefined;

    expect(typeof options?.onCreate).toBe("function");

    act(() => {
      options?.onCreate?.({ editor: mocked.editor });
    });

    expect(mocked.updateStats).toHaveBeenCalledWith("Hello world");
  });

  it("readOnly 에디터는 onCreate에서 updateStats를 호출하지 않는다", () => {
    // 스냅샷 뷰어 같은 readonly 에디터는 원래 통계를 쓰지 않던 라이터다. 마운트만으로
    // 공유 스토어를 덮어쓰면 본문 푸터 카운트가 스냅샷 내용으로 바뀐다.
    act(() => {
      root.render(<Editor readOnly initialContent="<p>Snapshot body</p>" />);
    });

    const options = mocked.useEditor.mock.calls[0]?.[0] as
      | { onCreate?: (context: { editor: typeof mocked.editor }) => void }
      | undefined;

    act(() => {
      options?.onCreate?.({ editor: mocked.editor });
    });

    expect(mocked.updateStats).not.toHaveBeenCalled();
  });
});
