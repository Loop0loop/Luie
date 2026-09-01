// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Editor from "../../src/renderer/src/features/editor/components/Editor.js";

/**
 * HIGH-7 회귀 고정: 챕터 전환은 Editor 리마운트(key 교체)가 아니라 동일 TipTap
 * 인스턴스의 setContent 스왑으로 처리된다.
 *
 * PROVES: (1) chapterId가 바뀌어도 useEditor(인스턴스 생성)가 재호출되지 않는다.
 *         (2) contentReady=true가 되면 setContent로 새 본문을 스왑한다.
 *         (3) 전환 창(contentReady=false)에서는 옛 본문을 유지하고 스왑하지 않는다.
 *         (4) 스왑 시 통계를 새 본문 기준으로 재계산한다.
 * DOES_NOT_PROVE: TipTap 실제 파싱/렌더, 자동저장 IPC — 각각 전용 테스트가 있다.
 */

const mocked = vi.hoisted(() => {
  let currentHtml = "<p>A</p>";
  const editor = {
    getHTML: vi.fn(() => currentHtml),
    getText: vi.fn(() => "B text"),
    commands: {
      setContent: vi.fn((html: string) => {
        currentHtml = html;
        return true;
      }),
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
    resetContent: () => {
      currentHtml = "<p>A</p>";
    },
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
      paragraphSpacing: 0,
      getFontFamily: () => "Inter",
    }),
  }),
);

vi.mock(
  "../../src/renderer/src/features/editor/hooks/useEditorScrollRestoration.js",
  () => ({ useEditorScrollRestoration: vi.fn() }),
);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@shared/ui/useDialog", () => ({
  useDialog: () => ({ toast: vi.fn(), prompt: vi.fn(), confirm: vi.fn() }),
}));

const renderEditor = async (
  props: Partial<React.ComponentProps<typeof Editor>>,
) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  // onEditorReady는 마운트 시 1회 발화하고(모의 editor 식별 불변), 리마운트면 다시
  // 발화한다. 리마운트 검출의 근거값으로 쓴다.
  const onEditorReady = vi.fn();
  await act(async () => {
    root.render(<Editor {...props} onEditorReady={onEditorReady} />);
    await Promise.resolve();
    await Promise.resolve();
  });
  const rerender = async (next: Partial<React.ComponentProps<typeof Editor>>) => {
    await act(async () => {
      root.render(<Editor {...next} onEditorReady={onEditorReady} />);
      await Promise.resolve();
      await Promise.resolve();
    });
  };
  const unmount = () => {
    act(() => root.unmount());
    container.remove();
  };
  return { rerender, unmount, onEditorReady };
};

describe("Editor chapter swap (no remount on chapter switch)", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    mocked.resetContent();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("swaps content via setContent when the chapter changes without recreating the editor", async () => {
    const view = await renderEditor({
      chapterId: "ch-a",
      initialContent: "<p>A</p>",
      contentReady: true,
      hideToolbar: true,
      hideFooter: true,
      hideTitle: true,
    });

    // 근거 1: 마운트 시 ready 리포트 1회.
    expect(view.onEditorReady).toHaveBeenCalledTimes(1);

    await view.rerender({
      chapterId: "ch-b",
      initialContent: "<p>B</p>",
      contentReady: true,
      hideToolbar: true,
      hideFooter: true,
      hideTitle: true,
    });

    // 근거 2: 챕터 전환 후에도 리마운트가 없다(ready 리포트 추가 발화 없음).
    expect(view.onEditorReady).toHaveBeenCalledTimes(1);
    // 근거 3: 동일 인스턴스에서 setContent로 새 본문이 들어간다.
    expect(mocked.editor.commands.setContent).toHaveBeenCalledWith("<p>B</p>");
    // 근거 4: 스왑 후 통계가 새 본문 기준으로 재계산된다.
    expect(mocked.updateStats).toHaveBeenCalledWith("B text");

    view.unmount();
  });

  it("keeps the previous chapter body during the switch window and swaps when content arrives", async () => {
    const view = await renderEditor({
      chapterId: "ch-a",
      initialContent: "<p>A</p>",
      contentReady: true,
      hideToolbar: true,
      hideFooter: true,
      hideTitle: true,
    });

    // 전환 클릭 커밋: chapterId는 바뀌었지만 새 본문은 아직 미도착.
    await view.rerender({
      chapterId: "ch-b",
      initialContent: "<p>B</p>",
      contentReady: false,
      hideToolbar: true,
      hideFooter: true,
      hideTitle: true,
    });

    // 근거: 전환 창에서는 스왑하지 않는다(옛 본문 유지 — 빈 화면/낡은 게이트 없음).
    expect(mocked.editor.commands.setContent).not.toHaveBeenCalledWith(
      "<p>B</p>",
    );

    // 본문 도착 커밋: contentReady=true → 스왑.
    await view.rerender({
      chapterId: "ch-b",
      initialContent: "<p>B</p>",
      contentReady: true,
      hideToolbar: true,
      hideFooter: true,
      hideTitle: true,
    });
    expect(mocked.editor.commands.setContent).toHaveBeenCalledWith("<p>B</p>");
    // 여러 커밋을 거쳐도 리마운트는 없다.
    expect(view.onEditorReady).toHaveBeenCalledTimes(1);

    view.unmount();
  });
});
