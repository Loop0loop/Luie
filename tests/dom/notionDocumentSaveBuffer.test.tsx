// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSaveBuffers } from "../../src/shared/ui/saveBufferRegistry.js";

const mocked = vi.hoisted(() => ({
  editorOptions: [] as Array<Record<string, (...args: never[]) => unknown>>,
  markdown: "",
}));

const extension = vi.hoisted(() => {
  const value = { configure: () => value };
  return value;
});

const editor = {
  storage: { markdown: { getMarkdown: () => mocked.markdown } },
  getText: () => mocked.markdown,
};

vi.mock("@tiptap/react", () => ({
  EditorContent: () => <div data-testid="editor-content" />,
  useEditor: (options: Record<string, (...args: never[]) => unknown>) => {
    mocked.editorOptions.push(options);
    return editor;
  },
}));
vi.mock("@tiptap/starter-kit", () => ({ default: extension }));
vi.mock("@tiptap/extension-placeholder", () => ({ default: extension }));
vi.mock("tiptap-markdown", () => ({ Markdown: extension }));

import NotionDocumentView from "../../src/renderer/src/features/research/components/shared/NotionDocumentView.js";

const roots = new Set<Root>();

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const mountDocument = (
  setSections = vi.fn(),
  setSectionContent = vi.fn(),
) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.add(root);
  act(() =>
    root.render(
      <NotionDocumentView
        properties={[]}
        sections={[{ id: "section-1", label: "Initial" }]}
        getSectionContent={() => "Body"}
        setSections={setSections}
        setSectionContent={setSectionContent}
        bodyPlaceholder="Write"
      />,
    ),
  );
  return { root, setSections, setSectionContent };
};

const updateMarkdown = (markdown: string) => {
  mocked.markdown = markdown;
  const options = mocked.editorOptions.at(-1);
  if (!options?.onUpdate) throw new Error("editor onUpdate missing");
  act(() => options.onUpdate({ editor } as never));
};

describe("Notion document save buffer", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    mocked.editorOptions.length = 0;
    mocked.markdown = "# Initial\n\nBody";
  });

  afterEach(() => {
    for (const root of roots) act(() => root.unmount());
    roots.clear();
    document.body.replaceChildren();
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  });

  it("flushes the latest markdown before the timer exactly once", async () => {
    const { setSections, setSectionContent } = mountDocument();
    updateMarkdown("# Latest\n\nNew body");

    await act(async () => flushSaveBuffers());

    expect(setSections).toHaveBeenCalledOnce();
    expect(setSections).toHaveBeenCalledWith([
      { id: "section-1", label: "Latest" },
    ]);
    expect(setSectionContent).toHaveBeenCalledOnce();
    expect(setSectionContent).toHaveBeenCalledWith("section-1", "New body");

    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(setSections).toHaveBeenCalledOnce();
    expect(setSectionContent).toHaveBeenCalledOnce();
  });

  it("shares one pending timer save with an explicit flush", async () => {
    const acknowledgement = deferred();
    const setSections = vi.fn(() => acknowledgement.promise);
    const { setSectionContent } = mountDocument(setSections);
    updateMarkdown("# One\n\nSnapshot");

    await act(async () => vi.advanceTimersByTimeAsync(500));
    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(setSections).toHaveBeenCalledOnce();
    expect(setSectionContent).toHaveBeenCalledOnce();
    expect(settled).toBe(false);

    acknowledgement.resolve();
    await act(async () => flush);
    expect(setSections).toHaveBeenCalledOnce();
    expect(setSectionContent).toHaveBeenCalledOnce();
  });

  it("serially drains markdown added during a save", async () => {
    const firstSections = deferred();
    const firstContent = deferred();
    const events: string[] = [];
    let sectionsCall = 0;
    let contentCall = 0;
    const setSections = vi.fn(() => {
      sectionsCall += 1;
      events.push(`${sectionsCall}:sections`);
      return sectionsCall === 1 ? firstSections.promise : undefined;
    });
    const setSectionContent = vi.fn(() => {
      contentCall += 1;
      events.push(`${contentCall}:content`);
      return contentCall === 1 ? firstContent.promise : undefined;
    });
    mountDocument(setSections, setSectionContent);
    updateMarkdown("# First\n\nOlder");

    const firstFlush = flushSaveBuffers();
    await act(async () => Promise.resolve());
    updateMarkdown("# Second\n\nNewest");
    const secondFlush = flushSaveBuffers();
    await act(async () => Promise.resolve());

    expect(events).toEqual(["1:sections", "1:content"]);
    firstSections.resolve();
    await act(async () => Promise.resolve());
    expect(events).toEqual(["1:sections", "1:content"]);

    firstContent.resolve();
    await act(async () => Promise.all([firstFlush, secondFlush]));

    expect(events).toEqual([
      "1:sections",
      "1:content",
      "2:sections",
      "2:content",
    ]);
    expect(setSections).toHaveBeenCalledTimes(2);
    expect(setSections).toHaveBeenNthCalledWith(1, [
      { id: "section-1", label: "First" },
    ]);
    expect(setSections).toHaveBeenNthCalledWith(2, [
      { id: "section-1", label: "Second" },
    ]);
    expect(setSectionContent).toHaveBeenNthCalledWith(
      2,
      "section-1",
      "Newest",
    );
  });

  it("waits for every setter before releasing a rejected snapshot", async () => {
    const failure = new Error("sections failed");
    const pendingContent = deferred();
    const events: string[] = [];
    let sectionsCall = 0;
    let contentCall = 0;
    const setSections = vi.fn(() => {
      sectionsCall += 1;
      events.push(`${sectionsCall}:sections`);
      return sectionsCall === 1 ? Promise.reject(failure) : undefined;
    });
    const setSectionContent = vi.fn(() => {
      contentCall += 1;
      events.push(`${contentCall}:content`);
      return contentCall === 1 ? pendingContent.promise : undefined;
    });
    mountDocument(setSections, setSectionContent);
    updateMarkdown("# First\n\nOlder");

    let firstSettled = false;
    let firstError: unknown;
    const firstFlush = flushSaveBuffers().then(
      () => {
        firstSettled = true;
      },
      (error: unknown) => {
        firstSettled = true;
        firstError = error;
      },
    );
    await act(async () => Promise.resolve());
    expect(firstSettled).toBe(false);

    updateMarkdown("# Latest\n\nNewest");
    let overlappingSettled = false;
    let overlappingError: unknown;
    const overlappingFlush = flushSaveBuffers().then(
      () => {
        overlappingSettled = true;
      },
      (error: unknown) => {
        overlappingSettled = true;
        overlappingError = error;
      },
    );
    await act(async () => Promise.resolve());

    expect(firstSettled).toBe(false);
    expect(overlappingSettled).toBe(false);
    expect(events).toEqual(["1:sections", "1:content"]);

    pendingContent.resolve();
    await act(async () => Promise.all([firstFlush, overlappingFlush]));

    expect(firstError).toBe(failure);
    expect(overlappingError).toBe(failure);
    expect(events).toEqual(["1:sections", "1:content"]);

    await act(async () => flushSaveBuffers());
    expect(events).toEqual([
      "1:sections",
      "1:content",
      "2:sections",
      "2:content",
    ]);
    expect(setSections).toHaveBeenCalledTimes(2);
    expect(setSectionContent).toHaveBeenCalledTimes(2);
  });

  it("waits for pending setters after a later setter throws", async () => {
    const pendingSections = deferred();
    const failure = new Error("content threw");
    const events: string[] = [];
    let sectionsCall = 0;
    let contentCall = 0;
    const setSections = vi.fn(() => {
      sectionsCall += 1;
      events.push(`${sectionsCall}:sections`);
      return sectionsCall === 1 ? pendingSections.promise : undefined;
    });
    const setSectionContent = vi.fn(() => {
      contentCall += 1;
      events.push(`${contentCall}:content`);
      if (contentCall === 1) throw failure;
    });
    mountDocument(setSections, setSectionContent);
    updateMarkdown("# First\n\nOlder");

    let firstSettled = false;
    let firstError: unknown;
    const firstFlush = flushSaveBuffers().then(
      () => {
        firstSettled = true;
      },
      (error: unknown) => {
        firstSettled = true;
        firstError = error;
      },
    );
    await act(async () => Promise.resolve());
    expect(firstSettled).toBe(false);

    updateMarkdown("# Latest\n\nNewest");
    let overlappingSettled = false;
    let overlappingError: unknown;
    const overlappingFlush = flushSaveBuffers().then(
      () => {
        overlappingSettled = true;
      },
      (error: unknown) => {
        overlappingSettled = true;
        overlappingError = error;
      },
    );
    await act(async () => Promise.resolve());

    expect(firstSettled).toBe(false);
    expect(overlappingSettled).toBe(false);
    expect(events).toEqual(["1:sections", "1:content"]);

    pendingSections.resolve();
    await act(async () => Promise.all([firstFlush, overlappingFlush]));

    expect(firstError).toBe(failure);
    expect(overlappingError).toBe(failure);
    expect(events).toEqual(["1:sections", "1:content"]);

    await act(async () => flushSaveBuffers());
    expect(events).toEqual([
      "1:sections",
      "1:content",
      "2:sections",
      "2:content",
    ]);
    expect(setSections).toHaveBeenCalledTimes(2);
    expect(setSectionContent).toHaveBeenCalledTimes(2);
  });

  it("keeps a failed explicit snapshot dirty for the next flush", async () => {
    const setSections = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("notion failed");
      })
      .mockImplementationOnce(() => undefined);
    mountDocument(setSections);
    updateMarkdown("# Retry\n\nBody");

    await expect(flushSaveBuffers()).rejects.toThrow("notion failed");
    await expect(flushSaveBuffers()).resolves.toBeUndefined();

    expect(setSections).toHaveBeenCalledTimes(2);
  });

  it("consumes a timer rejection and retries on explicit flush", async () => {
    const setSections = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("timer failed");
      })
      .mockImplementationOnce(() => undefined);
    mountDocument(setSections);
    updateMarkdown("# Timer retry\n\nBody");

    await act(async () => vi.advanceTimersByTimeAsync(500));
    await expect(flushSaveBuffers()).resolves.toBeUndefined();

    expect(setSections).toHaveBeenCalledTimes(2);
  });

  it("preserves newer markdown when unmounted during an in-flight save", async () => {
    const firstAcknowledgement = deferred();
    const setSections = vi
      .fn()
      .mockReturnValueOnce(firstAcknowledgement.promise)
      .mockRejectedValueOnce(new Error("unmount failed"))
      .mockImplementationOnce(() => undefined);
    const { root } = mountDocument(setSections);
    updateMarkdown("# First\n\nOlder");
    await act(async () => vi.advanceTimersByTimeAsync(500));
    updateMarkdown("# Unmount retry\n\nNewest");

    roots.delete(root);
    act(() => root.unmount());
    await act(async () => Promise.resolve());
    expect(setSections).toHaveBeenCalledOnce();

    firstAcknowledgement.resolve();
    await act(async () => Promise.resolve());
    await act(async () => Promise.resolve());
    expect(setSections).toHaveBeenCalledTimes(2);
    expect(setSections).toHaveBeenNthCalledWith(2, [
      { id: "section-1", label: "Unmount retry" },
    ]);

    await expect(flushSaveBuffers()).resolves.toBeUndefined();

    expect(setSections).toHaveBeenCalledTimes(3);
    expect(setSections).toHaveBeenNthCalledWith(3, [
      { id: "section-1", label: "Unmount retry" },
    ]);
  });
});
