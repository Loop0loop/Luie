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

  it("clears the parent editor reference on unmount", () => {
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

    expect(onEditorReady).toHaveBeenLastCalledWith(null);
  });
});
