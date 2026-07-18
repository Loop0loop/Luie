// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSaveBuffers } from "../../src/shared/ui/saveBufferRegistry.js";

const mocked = vi.hoisted(() => ({
  editorOptions: [] as Array<Record<string, (...args: never[]) => unknown>>,
  markdown: "",
  memoState: {
    notes: [] as Array<{
      id: string;
      title: string;
      content: string;
      tags: string[];
      updatedAt: string;
    }>,
    updateNote: vi.fn(),
    flushSave: vi.fn(),
  },
  entityState: {
    entity: null as null | {
      id: string;
      name: string;
      description: string;
      attributes: Record<string, unknown>;
    },
    isLoading: false,
    load: vi.fn(),
    update: vi.fn(),
  },
}));

const extension = vi.hoisted(() => {
  const value = { configure: () => value };
  return value;
});

const editor = {
  storage: {
    markdown: { getMarkdown: () => mocked.markdown },
  },
  getText: () => mocked.markdown,
  chain: () => ({
    focus: () => ({
      toggleBold: () => ({ run: vi.fn() }),
      toggleItalic: () => ({ run: vi.fn() }),
      toggleUnderline: () => ({ run: vi.fn() }),
      toggleStrike: () => ({ run: vi.fn() }),
      toggleHighlight: () => ({ run: vi.fn() }),
    }),
  }),
  isActive: () => false,
};

vi.mock("@tiptap/react", () => ({
  EditorContent: () => <div data-testid="editor-content" />,
  useEditor: (options: Record<string, (...args: never[]) => unknown>) => {
    mocked.editorOptions.push(options);
    return editor;
  },
}));

vi.mock("@tiptap/react/menus", () => ({
  BubbleMenu: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@tiptap/starter-kit", () => ({ default: extension }));
vi.mock("@tiptap/extension-task-list", () => ({ default: extension }));
vi.mock("@tiptap/extension-task-item", () => ({ default: extension }));
vi.mock("@tiptap/extension-highlight", () => ({ default: extension }));
vi.mock("@tiptap/extension-text-style", () => ({ TextStyle: extension }));
vi.mock("@tiptap/extension-color", () => ({ Color: extension }));
vi.mock("@tiptap/extension-underline", () => ({ default: extension }));
vi.mock("@tiptap/extension-details", () => ({
  Details: extension,
  DetailsSummary: extension,
  DetailsContent: extension,
}));
vi.mock("tiptap-markdown", () => ({ Markdown: extension }));
vi.mock(
  "@renderer/features/editor/components/hooks/useEditorExtensions",
  () => ({
    Callout: extension,
    SlashCommand: extension,
  }),
);
vi.mock("@renderer/features/editor/components/EditorToolbar", () => ({
  default: () => null,
}));
vi.mock("@renderer/features/editor/hooks/useEditorConfig", () => ({
  useEditorConfig: () => ({ fontFamilyCss: "sans-serif" }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));
vi.mock("@renderer/features/research/stores/memoStore", () => ({
  useMemoStore: (selector: (state: typeof mocked.memoState) => unknown) =>
    selector(mocked.memoState),
}));
vi.mock(
  "../../src/renderer/src/features/canvas/components/shell/document/useCanvasEntity.js",
  () => ({ useCanvasEntity: () => mocked.entityState }),
);

import CanvasDocumentView from "../../src/renderer/src/features/canvas/components/shell/CanvasDocumentView.js";
import { CanvasMarkdownEditor } from "../../src/renderer/src/features/canvas/components/shell/document/CanvasMarkdownEditor.js";

const roots = new Set<Root>();

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const mount = (element: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.add(root);
  act(() => root.render(element));
  return container;
};

const changeInput = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (!setter) throw new Error("input value setter missing");
  act(() => {
    input.focus();
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const changeTextArea = (textarea: HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (!setter) throw new Error("textarea value setter missing");
  act(() => {
    textarea.focus();
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const updateMarkdown = (value: string) => {
  mocked.markdown = value;
  const options = mocked.editorOptions.at(-1);
  if (!options?.onUpdate) throw new Error("editor onUpdate missing");
  act(() => options.onUpdate({ editor } as never));
};

describe("Canvas save buffers", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    mocked.editorOptions.length = 0;
    mocked.markdown = "initial";
    mocked.memoState.notes = [];
    mocked.memoState.updateNote.mockReset();
    mocked.memoState.flushSave.mockReset().mockResolvedValue(undefined);
    mocked.entityState.entity = null;
    mocked.entityState.load.mockReset().mockResolvedValue(undefined);
    mocked.entityState.update.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    for (const root of roots) act(() => root.unmount());
    roots.clear();
    document.body.replaceChildren();
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  });

  it("flushes latest markdown before the timer and waits for its ACK", async () => {
    const save = deferred();
    const onSave = vi.fn(() => save.promise);
    mount(<CanvasMarkdownEditor initialMarkdown="initial" onSave={onSave} />);

    updateMarkdown("latest markdown");
    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("latest markdown");
    expect(settled).toBe(false);

    save.resolve();
    await act(async () => flush);
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("keeps failed markdown dirty for the next barrier retry", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("markdown failed"))
      .mockResolvedValueOnce(undefined);
    mount(<CanvasMarkdownEditor initialMarkdown="initial" onSave={onSave} />);
    updateMarkdown("retry markdown");

    await expect(flushSaveBuffers()).rejects.toThrow("markdown failed");
    await expect(flushSaveBuffers()).resolves.toBeUndefined();

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(2, "retry markdown");
  });

  it("consumes a timer rejection and retries it through the next barrier", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("timer failed"))
      .mockResolvedValueOnce(undefined);
    mount(<CanvasMarkdownEditor initialMarkdown="initial" onSave={onSave} />);
    updateMarkdown("timer retry");

    await act(async () => vi.advanceTimersByTimeAsync(500));
    await expect(flushSaveBuffers()).resolves.toBeUndefined();

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith("timer retry");
  });

  it("retains a failed unmount snapshot for a later barrier retry", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("unmount failed"))
      .mockResolvedValueOnce(undefined);
    mount(<CanvasMarkdownEditor initialMarkdown="initial" onSave={onSave} />);
    updateMarkdown("unmount retry");

    const root = [...roots][0];
    if (!root) throw new Error("mounted root missing");
    roots.delete(root);
    act(() => root.unmount());
    await act(async () => Promise.resolve());

    await expect(flushSaveBuffers()).resolves.toBeUndefined();
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenLastCalledWith("unmount retry");
  });

  it("shares one save when the timer and barrier race", async () => {
    const save = deferred();
    const onSave = vi.fn(() => save.promise);
    mount(<CanvasMarkdownEditor initialMarkdown="initial" onSave={onSave} />);
    updateMarkdown("one snapshot");

    await act(async () => vi.advanceTimersByTimeAsync(500));
    const flush = flushSaveBuffers();
    await act(async () => Promise.resolve());
    expect(onSave).toHaveBeenCalledOnce();

    save.resolve();
    await act(async () => flush);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("waits for memo title persistence after updating the store", async () => {
    const save = deferred();
    mocked.memoState.notes = [
      {
        id: "memo-1",
        title: "Old",
        content: "Body",
        tags: [],
        updatedAt: "now",
      },
    ];
    mocked.memoState.flushSave.mockReturnValue(save.promise);
    const container = mount(
      <CanvasDocumentView preview={{ kind: "memo", id: "memo-1" }} />,
    );
    const input = container.querySelector("input");
    if (!input) throw new Error("memo title input missing");

    changeInput(input, "Latest title");
    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(mocked.memoState.updateNote).toHaveBeenCalledWith("memo-1", {
      title: "Latest title",
    });
    expect(mocked.memoState.flushSave).toHaveBeenCalledOnce();
    expect(settled).toBe(false);

    save.resolve();
    await act(async () => flush);
  });

  it("waits for memo content persistence after the markdown update", async () => {
    const save = deferred();
    mocked.memoState.notes = [
      {
        id: "memo-1",
        title: "Memo",
        content: "Old body",
        tags: [],
        updatedAt: "now",
      },
    ];
    mocked.memoState.flushSave.mockReturnValue(save.promise);
    mount(<CanvasDocumentView preview={{ kind: "memo", id: "memo-1" }} />);
    updateMarkdown("Latest body");

    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(mocked.memoState.updateNote).toHaveBeenCalledWith("memo-1", {
      content: "Latest body",
    });
    expect(mocked.memoState.flushSave).toHaveBeenCalledOnce();
    expect(settled).toBe(false);

    save.resolve();
    await act(async () => flush);
  });

  it("flushes a focused entity description and waits for entity update", async () => {
    const save = deferred();
    mocked.entityState.entity = {
      id: "character-1",
      name: "Name",
      description: "Old description",
      attributes: {},
    };
    mocked.entityState.update.mockReturnValue(save.promise);
    const container = mount(
      <CanvasDocumentView preview={{ kind: "character", id: "character-1" }} />,
    );
    await act(async () => Promise.resolve());
    const textarea = container.querySelector("textarea");
    if (!textarea) throw new Error("entity description textarea missing");

    changeTextArea(textarea, "Latest description");
    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(mocked.entityState.update).toHaveBeenCalledWith({
      id: "character-1",
      description: "Latest description",
    });
    expect(settled).toBe(false);

    save.resolve();
    await act(async () => flush);
  });

  it("returns the entity title update Promise to the barrier", async () => {
    const save = deferred();
    mocked.entityState.entity = {
      id: "character-1",
      name: "Old name",
      description: "Description",
      attributes: {},
    };
    mocked.entityState.update.mockReturnValue(save.promise);
    const container = mount(
      <CanvasDocumentView preview={{ kind: "character", id: "character-1" }} />,
    );
    await act(async () => Promise.resolve());
    const input = container.querySelector("input");
    if (!input) throw new Error("entity title input missing");
    changeInput(input, "Latest name");

    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(mocked.entityState.update).toHaveBeenCalledWith({
      id: "character-1",
      name: "Latest name",
    });
    expect(settled).toBe(false);

    save.resolve();
    await act(async () => flush);
  });

  it("returns the entity markdown update Promise to the barrier", async () => {
    const save = deferred();
    mocked.entityState.entity = {
      id: "character-1",
      name: "Name",
      description: "Description",
      attributes: {},
    };
    mocked.entityState.update.mockReturnValue(save.promise);
    mount(
      <CanvasDocumentView preview={{ kind: "character", id: "character-1" }} />,
    );
    await act(async () => Promise.resolve());
    updateMarkdown("Latest entity body");

    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(mocked.entityState.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "character-1",
        attributes: expect.objectContaining({
          canvasDocumentMarkdown: "Latest entity body",
        }),
      }),
    );
    expect(settled).toBe(false);

    save.resolve();
    await act(async () => flush);
  });
});
