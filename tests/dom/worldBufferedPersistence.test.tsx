// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSaveBuffers } from "../../src/shared/ui/saveBufferRegistry.js";

const mocked = vi.hoisted(() => ({
  loadPlot: vi.fn(),
  savePlot: vi.fn(),
  loadSynopsis: vi.fn(),
  saveSynopsis: vi.fn(),
  updateProject: vi.fn(),
  showToast: vi.fn(),
  project: {
    id: "project-1",
    title: "Project",
    description: "Old synopsis",
    projectPath: "/tmp/project-1.luie",
  },
}));

vi.mock("@renderer/features/project/stores/projectStore", () => ({
  useProjectStore: (selector: (state: unknown) => unknown) =>
    selector({
      currentItem: mocked.project,
      update: mocked.updateProject,
    }),
}));

vi.mock("@renderer/features/research/services/worldPackageStorage", () => ({
  worldPackageStorage: {
    loadPlot: mocked.loadPlot,
    savePlot: mocked.savePlot,
    loadSynopsis: mocked.loadSynopsis,
    saveSynopsis: mocked.saveSynopsis,
  },
}));

vi.mock("@shared/ui/ToastContext", () => ({
  useToast: () => ({ showToast: mocked.showToast }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

import { PlotBoard } from "../../src/renderer/src/features/research/components/world/PlotBoard.js";
import { SynopsisEditor } from "../../src/renderer/src/features/research/components/world/SynopsisEditor.js";

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
  return { container, root };
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

describe("world buffered persistence ACK", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    mocked.loadPlot.mockReset().mockResolvedValue({
      columns: [{ id: "act1", title: "Old act", cards: [] }],
    });
    mocked.savePlot.mockReset().mockResolvedValue(undefined);
    mocked.loadSynopsis.mockReset().mockResolvedValue({
      synopsis: "Old synopsis",
      status: "draft",
      genre: "Old genre",
      targetAudience: "",
      logline: "",
    });
    mocked.saveSynopsis.mockReset().mockResolvedValue(undefined);
    mocked.updateProject.mockReset().mockResolvedValue({ id: "project-1" });
    mocked.showToast.mockReset();
  });

  afterEach(() => {
    for (const root of roots) act(() => root.unmount());
    roots.clear();
    document.body.replaceChildren();
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  });

  it("waits for the exact plot persistence ACK before completing a flush", async () => {
    const save = deferred();
    mocked.savePlot.mockReturnValueOnce(save.promise);
    const { container } = mount(<PlotBoard />);
    await act(async () => Promise.resolve());
    const input = container.querySelector("input");
    if (!input) throw new Error("plot title input missing");

    changeInput(input, "New act");
    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(mocked.savePlot).toHaveBeenCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      { columns: [{ id: "act1", title: "New act", cards: [] }] },
    );
    expect(settled).toBe(false);

    save.resolve();
    await act(async () => flush);
    expect(settled).toBe(true);
  });

  it("waits for synopsis persistence before completing a flush", async () => {
    const save = deferred();
    mocked.saveSynopsis.mockReturnValueOnce(save.promise);
    const { container } = mount(<SynopsisEditor />);
    await act(async () => Promise.resolve());
    const input = container.querySelector("input");
    if (!input) throw new Error("synopsis genre input missing");

    changeInput(input, "New genre");
    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(mocked.saveSynopsis).toHaveBeenCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({ genre: "New genre" }),
    );
    expect(settled).toBe(false);

    save.resolve();
    await act(async () => flush);
    expect(settled).toBe(true);
  });

  it("waits for both project and package ACKs for the main synopsis", async () => {
    let resolveProject!: (value: { id: string }) => void;
    const projectSave = new Promise<{ id: string }>((resolve) => {
      resolveProject = resolve;
    });
    const packageSave = deferred();
    mocked.updateProject.mockReturnValueOnce(projectSave);
    mocked.saveSynopsis.mockReturnValueOnce(packageSave.promise);
    const { container } = mount(<SynopsisEditor />);
    await act(async () => Promise.resolve());
    const textareas = container.querySelectorAll("textarea");
    const synopsis = textareas.item(textareas.length - 1);
    if (!synopsis) throw new Error("main synopsis textarea missing");

    changeTextArea(synopsis, "New synopsis");
    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(mocked.updateProject).toHaveBeenCalledWith({
      id: "project-1",
      description: "New synopsis",
    });
    expect(mocked.saveSynopsis).toHaveBeenCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({ synopsis: "New synopsis" }),
    );
    expect(settled).toBe(false);

    resolveProject({ id: "project-1" });
    await act(async () => Promise.resolve());
    expect(settled).toBe(false);
    packageSave.resolve();
    await act(async () => flush);
    expect(settled).toBe(true);
  });
});
