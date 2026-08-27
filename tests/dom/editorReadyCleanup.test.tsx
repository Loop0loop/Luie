// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Editor from "../../src/renderer/src/features/editor/components/Editor.js";

const mocked = vi.hoisted(() => {
  const editor = {
    getHTML: vi.fn(() => "<p>Hello</p>"),
    getText: vi.fn(() => "Hello"),
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
      tr: {
        scrollIntoView: vi.fn(),
      },
    },
    view: {
      dispatch: vi.fn(),
    },
  };

  return {
    editor,
    useEditor: vi.fn(() => editor),
  };
});

vi.mock("@tiptap/react", () => ({
  useEditor: mocked.useEditor,
  EditorContent: () => <div data-testid="editor-content-mock" />,
}));

vi.mock(
  "../../src/renderer/src/features/editor/components/EditorBubbleMenu.js",
  () => ({
    default: () => null,
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/components/EditorToolbar.js",
  () => ({
    default: () => null,
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/hooks/useBufferedInput.js",
  () => ({
    useBufferedInput: (initialValue: string) => ({
      value: initialValue,
      onChange: vi.fn(),
    }),
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/hooks/useEditorAutosave.js",
  () => ({
    useEditorAutosave: vi.fn(),
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/hooks/useEditorStats.js",
  () => ({
    useEditorStats: () => ({
      updateStats: vi.fn(),
    }),
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
  () => ({
    useEditorScrollRestoration: vi.fn(),
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/components/hooks/useEditorExtensions.js",
  () => ({
    useEditorExtensions: () => [],
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/components/hooks/useSmartLinkClickHandler.js",
  () => ({
    useSmartLinkClickHandler: () => vi.fn(),
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/components/hooks/useTypewriterScroll.js",
  () => ({
    useTypewriterScroll: vi.fn(),
  }),
);

vi.mock(
  "../../src/renderer/src/features/workspace/services/exportEntryService.js",
  () => ({
    openQuickExportEntry: vi.fn(),
  }),
);

vi.mock(
  "../../src/renderer/src/features/workspace/services/chapterNavigation.js",
  () => ({
    consumePendingEditorFocusQuery: vi.fn(() => null),
  }),
);

vi.mock(
  "../../src/renderer/src/features/workspace/utils/EditorSyncBus.js",
  () => ({
    EditorSyncBus: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
);

vi.mock("../../src/renderer/src/features/editor/stores/editorStore.js", () => ({
  useEditorStore: (selector: (state: { entityColors: null; maxWidth: number }) => unknown) =>
    selector({ entityColors: null, maxWidth: 800 }),
}));

vi.mock(
  "../../src/renderer/src/features/research/stores/characterStore.js",
  () => ({
    useCharacterStore: {
      getState: () => ({ characters: [] }),
    },
  }),
);

vi.mock("../../src/renderer/src/features/research/stores/termStore.js", () => ({
  useTermStore: {
    getState: () => ({ terms: [] }),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@shared/ui/useDialog", () => ({
  useDialog: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@shared/ui/StatusFooter", () => ({
  default: () => null,
}));

describe("Editor onEditorReady lifecycle", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mocked.useEditor.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = "";
  });

  it("keeps the parent reference intact on unmount (no stale null write-back)", () => {
    const onEditorReady = vi.fn();

    act(() => {
      root.render(
        <Editor
          initialContent="<p>Hello</p>"
          initialTitle="Chapter"
          onEditorReady={onEditorReady}
        />,
      );
    });

    expect(onEditorReady).toHaveBeenLastCalledWith(mocked.editor);

    act(() => {
      root.unmount();
    });

    // NOTE: 캔버스 왕복처럼 언마운트 → 마운트가 이어질 때 이전 Editor의 null
    // 되돌려주기가 새 Editor의 ready 리포트보다 나중에 커밋되면 docEditor가
    // 영구 stale/null로 남는다(툴바 빈 막대 증상). 따라서 언마운트 시 무효화를
    // 하지 않는 것이 계약이고, 유효성은 소비자(isUsableEditor)가 검사한다.
    expect(onEditorReady).toHaveBeenCalledTimes(1);
    expect(onEditorReady).toHaveBeenLastCalledWith(mocked.editor);
  });

  it("keeps ProseMirror content in normal block flow", () => {
    act(() => {
      root.render(<Editor initialContent="<p>Hello</p>" />);
    });

    const options = mocked.useEditor.mock.calls[0]?.[0];
    expect(options?.editorProps?.attributes?.class).toBe("tiptap outline-none");
  });
});
