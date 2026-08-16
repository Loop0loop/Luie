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
  flushWorldEntityMutations: vi.fn(),
  manualSave: vi.fn(),
  logWarn: vi.fn(),
  translate: (key: string, fallback?: string) => fallback ?? key,
  project: {
    id: "project-1",
    title: "Project",
    description: "Old synopsis",
    projectPath: "/tmp/project-1.luie",
  },
}));

vi.mock("@renderer/shared/store/worldEntityMutationQueue", () => ({
  flushWorldEntityMutations: mocked.flushWorldEntityMutations,
}));

vi.mock("@shared/api", () => ({
  api: {
    app: { manualSave: mocked.manualSave },
    logger: { warn: mocked.logWarn },
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
    t: mocked.translate,
  }),
}));

import { PlotBoard } from "../../src/renderer/src/features/research/components/world/PlotBoard.js";
import { SynopsisEditor } from "../../src/renderer/src/features/research/components/world/SynopsisEditor.js";
import { saveProjectNow } from "../../src/renderer/src/features/workspace/services/saveCoordinator.js";

const roots = new Set<Root>();

const deferred = <T = void,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
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
    Object.assign(mocked.project, {
      id: "project-1",
      title: "Project",
      description: "Old synopsis",
      projectPath: "/tmp/project-1.luie",
    });
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
    mocked.flushWorldEntityMutations.mockReset().mockResolvedValue(undefined);
    mocked.manualSave.mockReset().mockResolvedValue({
      success: true,
      data: { success: true, exported: true },
    });
    mocked.logWarn.mockReset().mockResolvedValue(undefined);
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

  it("blocks project save on a plot button mutation and retries failure", async () => {
    const pending = deferred();
    mocked.savePlot
      .mockReturnValueOnce(pending.promise)
      .mockRejectedValueOnce(new Error("plot failed"))
      .mockResolvedValueOnce(undefined);
    const { container } = mount(<PlotBoard />);
    await act(async () => Promise.resolve());
    const add = container.querySelector<HTMLElement>(
      '[title="world.plot.addAct"]',
    );
    if (!add) throw new Error("plot add button missing");

    act(() => add.click());
    const projectSave = saveProjectNow("project-1");
    await act(async () => Promise.resolve());
    expect(mocked.flushWorldEntityMutations).not.toHaveBeenCalled();
    expect(mocked.manualSave).not.toHaveBeenCalled();

    pending.resolve();
    await act(async () => projectSave);
    expect(mocked.flushWorldEntityMutations).toHaveBeenCalledOnce();
    expect(mocked.manualSave).toHaveBeenCalledOnce();

    act(() => add.click());
    await expect(flushSaveBuffers()).rejects.toThrow("plot failed");
    await act(async () => flushSaveBuffers());
    expect(mocked.savePlot).toHaveBeenCalledTimes(3);
    expect(mocked.savePlot).toHaveBeenLastCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ title: "world.plot.newAct 3" }),
        ]),
      }),
    );
  });

  it("awaits and retries a failed synopsis status mutation", async () => {
    const pending = deferred();
    mocked.saveSynopsis
      .mockReturnValueOnce(pending.promise)
      .mockRejectedValueOnce(new Error("status failed"))
      .mockResolvedValueOnce(undefined);
    const { container } = mount(<SynopsisEditor />);
    await act(async () => Promise.resolve());
    const working = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "world.synopsis.status.working",
    );
    if (!working) throw new Error("working status button missing");

    act(() => working.click());
    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());
    expect(settled).toBe(false);
    pending.resolve();
    await act(async () => flush);

    act(() => working.click());
    await expect(flushSaveBuffers()).rejects.toThrow("status failed");
    await act(async () => flushSaveBuffers());
    expect(mocked.saveSynopsis).toHaveBeenCalledTimes(3);
    expect(mocked.saveSynopsis).toHaveBeenLastCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({ status: "working" }),
    );
  });

  it("does not rehydrate or overwrite a saved synopsis after project rerender", async () => {
    const packageSave = deferred();
    mocked.saveSynopsis.mockReturnValueOnce(packageSave.promise);
    const { container, root } = mount(<SynopsisEditor />);
    await act(async () => Promise.resolve());
    const textareas = container.querySelectorAll("textarea");
    const synopsis = textareas.item(textareas.length - 1);
    if (!synopsis) throw new Error("main synopsis textarea missing");

    changeTextArea(synopsis, "Latest synopsis");
    const mainFlush = flushSaveBuffers();
    await act(async () => Promise.resolve());
    mocked.project.description = "Latest synopsis";
    act(() => root.render(<SynopsisEditor />));
    await act(async () => Promise.resolve());
    expect(mocked.loadSynopsis).toHaveBeenCalledOnce();
    packageSave.resolve();
    await act(async () => mainFlush);

    const genre = container.querySelector("input");
    if (!genre) throw new Error("synopsis genre input missing");
    changeInput(genre, "New genre");
    await act(async () => flushSaveBuffers());

    expect(mocked.saveSynopsis).toHaveBeenLastCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        synopsis: "Latest synopsis",
        genre: "New genre",
      }),
    );
  });

  it("drains a failed plot snapshot to its original project before the next project", async () => {
    const failedA = deferred();
    const retryA = deferred();
    mocked.loadPlot
      .mockResolvedValueOnce({
        columns: [{ id: "act-a", title: "Project A", cards: [] }],
      })
      .mockResolvedValueOnce({
        columns: [{ id: "act-b", title: "Project B", cards: [] }],
      });
    mocked.savePlot
      .mockReturnValueOnce(failedA.promise)
      .mockReturnValueOnce(retryA.promise)
      .mockResolvedValueOnce(undefined);
    const { container, root } = mount(<PlotBoard />);
    await act(async () => Promise.resolve());
    const add = container.querySelector<HTMLElement>(
      '[title="world.plot.addAct"]',
    );
    if (!add) throw new Error("plot add button missing");

    act(() => add.click());
    const failedPayload = mocked.savePlot.mock.calls[0]?.[2];
    failedA.reject(new Error("project A plot failed"));
    await act(async () => {
      await failedA.promise.catch(() => undefined);
    });

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<PlotBoard />));
    await act(async () => Promise.resolve());

    expect(mocked.savePlot).toHaveBeenNthCalledWith(
      2,
      "project-1",
      "/tmp/project-1.luie",
      failedPayload,
    );

    const input = container.querySelector("input");
    if (!input) throw new Error("project B plot title input missing");
    changeInput(input, "Project B changed");
    act(() => input.blur());
    const flush = flushSaveBuffers();
    await act(async () => Promise.resolve());
    expect(mocked.savePlot).toHaveBeenCalledTimes(2);

    retryA.resolve();
    await act(async () => flush);
    expect(mocked.savePlot).toHaveBeenNthCalledWith(
      3,
      "project-2",
      "/tmp/project-2.luie",
      {
        columns: [
          { id: "act-b", title: "Project B changed", cards: [] },
        ],
      },
    );
  });

  it("keeps a failed synopsis retry scoped while the next project is hydrated", async () => {
    const failedA = deferred();
    const retryA = deferred();
    mocked.loadSynopsis
      .mockResolvedValueOnce({
        synopsis: "Project A synopsis",
        status: "draft",
        genre: "Project A genre",
        targetAudience: "",
        logline: "",
      })
      .mockResolvedValueOnce({
        synopsis: "Project B synopsis",
        status: "draft",
        genre: "Project B genre",
        targetAudience: "",
        logline: "",
      });
    mocked.saveSynopsis
      .mockReturnValueOnce(failedA.promise)
      .mockReturnValueOnce(retryA.promise)
      .mockResolvedValueOnce(undefined);
    const { container, root } = mount(<SynopsisEditor />);
    await act(async () => Promise.resolve());
    const working = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "world.synopsis.status.working",
    );
    if (!working) throw new Error("working status button missing");

    act(() => working.click());
    const failedPayload = mocked.saveSynopsis.mock.calls[0]?.[2];
    failedA.reject(new Error("project A synopsis failed"));
    await act(async () => {
      await failedA.promise.catch(() => undefined);
    });

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<SynopsisEditor />));
    await act(async () => Promise.resolve());

    expect(mocked.saveSynopsis).toHaveBeenNthCalledWith(
      2,
      "project-1",
      "/tmp/project-1.luie",
      failedPayload,
    );

    const input = container.querySelector("input");
    if (!input) throw new Error("project B synopsis genre input missing");
    changeInput(input, "Project B changed");
    act(() => input.blur());
    const flush = flushSaveBuffers();
    await act(async () => Promise.resolve());
    expect(mocked.saveSynopsis).toHaveBeenCalledTimes(2);

    retryA.resolve();
    await act(async () => flush);
    expect(mocked.saveSynopsis).toHaveBeenNthCalledWith(
      3,
      "project-2",
      "/tmp/project-2.luie",
      expect.objectContaining({
        synopsis: "Project B synopsis",
        genre: "Project B changed",
      }),
    );
  });

  it("blocks a new project plot mutation until its existing data loads", async () => {
    const projectBLoad = deferred<{
      columns: { id: string; title: string; cards: never[] }[];
    }>();
    mocked.loadPlot
      .mockResolvedValueOnce({
        columns: [{ id: "act-a", title: "Project A", cards: [] }],
      })
      .mockReturnValueOnce(projectBLoad.promise);
    const { container, root } = mount(<PlotBoard />);
    await act(async () => Promise.resolve());

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<PlotBoard />));
    const add = container.querySelector<HTMLButtonElement>(
      '[title="world.plot.addAct"]',
    );
    if (!add) throw new Error("plot add button missing while loading");
    expect(add.matches(":disabled")).toBe(true);
    act(() => add.click());
    await act(async () => flushSaveBuffers());
    expect(mocked.savePlot).not.toHaveBeenCalled();

    projectBLoad.resolve({
      columns: [{ id: "act-b", title: "Existing Project B", cards: [] }],
    });
    await act(async () => projectBLoad.promise);
    expect(add.matches(":disabled")).toBe(false);
    act(() => add.click());
    await act(async () => flushSaveBuffers());
    expect(mocked.savePlot).toHaveBeenCalledWith(
      "project-2",
      "/tmp/project-2.luie",
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({
            id: "act-b",
            title: "Existing Project B",
          }),
        ]),
      }),
    );
  });

  it("blocks a new project synopsis mutation until its existing data loads", async () => {
    const projectBLoad = deferred<{
      synopsis: string;
      status: "draft";
      genre: string;
      targetAudience: string;
      logline: string;
    }>();
    mocked.loadSynopsis
      .mockResolvedValueOnce({
        synopsis: "Project A synopsis",
        status: "draft",
        genre: "Project A genre",
        targetAudience: "",
        logline: "",
      })
      .mockReturnValueOnce(projectBLoad.promise);
    const { container, root } = mount(<SynopsisEditor />);
    await act(async () => Promise.resolve());

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<SynopsisEditor />));
    const working = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "world.synopsis.status.working",
    );
    if (!working) throw new Error("working status button missing while loading");
    expect(working.matches(":disabled")).toBe(true);
    act(() => working.click());
    await act(async () => flushSaveBuffers());
    expect(mocked.saveSynopsis).not.toHaveBeenCalled();

    projectBLoad.resolve({
      synopsis: "Existing Project B synopsis",
      status: "draft",
      genre: "Existing Project B genre",
      targetAudience: "Existing audience",
      logline: "Existing logline",
    });
    await act(async () => projectBLoad.promise);
    expect(working.matches(":disabled")).toBe(false);
    act(() => working.click());
    await act(async () => flushSaveBuffers());
    expect(mocked.saveSynopsis).toHaveBeenCalledWith(
      "project-2",
      "/tmp/project-2.luie",
      expect.objectContaining({
        synopsis: "Existing Project B synopsis",
        status: "working",
        genre: "Existing Project B genre",
        targetAudience: "Existing audience",
        logline: "Existing logline",
      }),
    );
  });

  it("keeps a dirty plot input bound to project A when switching before blur", async () => {
    const projectBLoad = deferred<{
      columns: { id: string; title: string; cards: never[] }[];
    }>();
    mocked.loadPlot
      .mockResolvedValueOnce({
        columns: [{ id: "act1", title: "Project A", cards: [] }],
      })
      .mockReturnValueOnce(projectBLoad.promise);
    const { container, root } = mount(<PlotBoard />);
    await act(async () => Promise.resolve());
    const input = container.querySelector("input");
    if (!input) throw new Error("project A plot title input missing");
    changeInput(input, "Project A dirty");

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<PlotBoard />));
    await act(async () => Promise.resolve());

    expect(mocked.savePlot).toHaveBeenCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      {
        columns: [{ id: "act1", title: "Project A dirty", cards: [] }],
      },
    );
    expect(mocked.savePlot).not.toHaveBeenCalledWith(
      "project-2",
      expect.anything(),
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ title: "Project A dirty" }),
        ]),
      }),
    );
  });

  it("keeps a dirty synopsis textarea bound to project A when switching before blur", async () => {
    const projectBLoad = deferred<{
      synopsis: string;
      status: "draft";
      genre: string;
      targetAudience: string;
      logline: string;
    }>();
    mocked.loadSynopsis
      .mockResolvedValueOnce({
        synopsis: "Project A synopsis",
        status: "draft",
        genre: "Project A genre",
        targetAudience: "",
        logline: "",
      })
      .mockReturnValueOnce(projectBLoad.promise);
    const { container, root } = mount(<SynopsisEditor />);
    await act(async () => Promise.resolve());
    const textareas = container.querySelectorAll("textarea");
    const synopsis = textareas.item(textareas.length - 1);
    if (!synopsis) throw new Error("project A synopsis textarea missing");
    changeTextArea(synopsis, "Project A dirty synopsis");

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<SynopsisEditor />));
    await act(async () => Promise.resolve());

    expect(mocked.updateProject).toHaveBeenCalledWith({
      id: "project-1",
      description: "Project A dirty synopsis",
    });
    expect(mocked.saveSynopsis).toHaveBeenCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({ synopsis: "Project A dirty synopsis" }),
    );
  });

  it("keeps the initial project A save ahead of project B mutations", async () => {
    const saveA = deferred();
    mocked.loadPlot
      .mockResolvedValueOnce({
        columns: [{ id: "act-a", title: "Project A", cards: [] }],
      })
      .mockResolvedValueOnce({
        columns: [{ id: "act-b", title: "Project B", cards: [] }],
      });
    mocked.savePlot.mockReturnValueOnce(saveA.promise).mockResolvedValueOnce();
    const { container, root } = mount(<PlotBoard />);
    await act(async () => Promise.resolve());
    const addA = container.querySelector<HTMLElement>(
      '[title="world.plot.addAct"]',
    );
    if (!addA) throw new Error("project A plot add button missing");
    act(() => addA.click());

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<PlotBoard />));
    await act(async () => Promise.resolve());
    const addB = container.querySelector<HTMLElement>(
      '[title="world.plot.addAct"]',
    );
    if (!addB) throw new Error("project B plot add button missing");
    act(() => addB.click());
    const flush = flushSaveBuffers();
    await act(async () => Promise.resolve());
    expect(mocked.savePlot).toHaveBeenCalledTimes(1);

    saveA.resolve();
    await act(async () => flush);
    expect(mocked.savePlot).toHaveBeenNthCalledWith(
      2,
      "project-2",
      "/tmp/project-2.luie",
      expect.objectContaining({
        columns: expect.not.arrayContaining([
          expect.objectContaining({ id: "act-a" }),
        ]),
      }),
    );
  });

  it("ignores a late plot load after a project B mutation is acknowledged", async () => {
    const lateProjectBLoad = deferred<{
      columns: { id: string; title: string; cards: never[] }[];
    }>();
    mocked.loadPlot
      .mockResolvedValueOnce({
        columns: [{ id: "act-a", title: "Project A", cards: [] }],
      })
      .mockResolvedValueOnce({
        columns: [{ id: "act-b", title: "Existing Project B", cards: [] }],
      })
      .mockResolvedValueOnce({
        columns: [{ id: "act-a", title: "Project A", cards: [] }],
      })
      .mockReturnValueOnce(lateProjectBLoad.promise);
    const { container, root } = mount(<PlotBoard />);
    await act(async () => Promise.resolve());

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<PlotBoard />));
    await act(async () => Promise.resolve());

    Object.assign(mocked.project, {
      id: "project-1",
      title: "Project A",
      description: "Project A synopsis",
      projectPath: "/tmp/project-1.luie",
    });
    act(() => root.render(<PlotBoard />));
    await act(async () => Promise.resolve());
    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<PlotBoard />));
    const add = container.querySelector<HTMLElement>(
      '[title="world.plot.addAct"]',
    );
    if (!add) throw new Error("project B plot add button missing");
    act(() => add.click());
    await act(async () => flushSaveBuffers());
    const acknowledged = mocked.savePlot.mock.calls[0]?.[2];

    lateProjectBLoad.resolve({
      columns: [{ id: "stale", title: "Stale load", cards: [] }],
    });
    await act(async () => lateProjectBLoad.promise);
    act(() => add.click());
    await act(async () => flushSaveBuffers());

    expect(mocked.savePlot).toHaveBeenLastCalledWith(
      "project-2",
      "/tmp/project-2.luie",
      expect.objectContaining({
        columns: expect.arrayContaining(acknowledged?.columns ?? []),
      }),
    );
    expect(mocked.savePlot).not.toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ id: "stale" }),
        ]),
      }),
    );
  });

  it("ignores a late synopsis load after a project B mutation is acknowledged", async () => {
    const lateProjectBLoad = deferred<{
      synopsis: string;
      status: "draft";
      genre: string;
      targetAudience: string;
      logline: string;
    }>();
    mocked.loadSynopsis
      .mockResolvedValueOnce({
        synopsis: "Project A synopsis",
        status: "draft",
        genre: "Project A genre",
        targetAudience: "",
        logline: "",
      })
      .mockResolvedValueOnce({
        synopsis: "Existing Project B synopsis",
        status: "draft",
        genre: "Existing Project B genre",
        targetAudience: "",
        logline: "",
      })
      .mockResolvedValueOnce({
        synopsis: "Project A synopsis",
        status: "draft",
        genre: "Project A genre",
        targetAudience: "",
        logline: "",
      })
      .mockReturnValueOnce(lateProjectBLoad.promise);
    const { container, root } = mount(<SynopsisEditor />);
    await act(async () => Promise.resolve());

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<SynopsisEditor />));
    await act(async () => Promise.resolve());

    Object.assign(mocked.project, {
      id: "project-1",
      title: "Project A",
      description: "Project A synopsis",
      projectPath: "/tmp/project-1.luie",
    });
    act(() => root.render(<SynopsisEditor />));
    await act(async () => Promise.resolve());
    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<SynopsisEditor />));
    const working = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "world.synopsis.status.working",
    );
    if (!working) throw new Error("working status button missing");
    act(() => working.click());
    await act(async () => flushSaveBuffers());

    lateProjectBLoad.resolve({
      synopsis: "Stale synopsis",
      status: "draft",
      genre: "Stale genre",
      targetAudience: "",
      logline: "",
    });
    await act(async () => lateProjectBLoad.promise);
    const locked = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "world.synopsis.status.locked",
    );
    if (!locked) throw new Error("locked status button missing");
    act(() => locked.click());
    await act(async () => flushSaveBuffers());

    expect(mocked.saveSynopsis).toHaveBeenLastCalledWith(
      "project-2",
      "/tmp/project-2.luie",
      expect.objectContaining({
        synopsis: "Existing Project B synopsis",
        status: "locked",
        genre: "Existing Project B genre",
      }),
    );
  });

  it("keeps an acknowledged pending plot snapshot over a late revisit load", async () => {
    const retryA = deferred();
    const revisitALoad = deferred<{
      columns: { id: string; title: string; cards: never[] }[];
    }>();
    mocked.loadPlot
      .mockResolvedValueOnce({
        columns: [{ id: "act1", title: "Project A", cards: [] }],
      })
      .mockResolvedValueOnce({
        columns: [{ id: "act1", title: "Project B", cards: [] }],
      })
      .mockReturnValueOnce(revisitALoad.promise);
    mocked.savePlot
      .mockRejectedValueOnce(new Error("project A plot failed"))
      .mockReturnValueOnce(retryA.promise)
      .mockResolvedValueOnce(undefined);
    const { container, root } = mount(<PlotBoard />);
    await act(async () => Promise.resolve());
    const addA = container.querySelector<HTMLButtonElement>(
      '[title="world.plot.addAct"]',
    );
    if (!addA) throw new Error("project A add button missing");
    act(() => addA.click());
    await act(async () => Promise.resolve());

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<PlotBoard />));
    await act(async () => Promise.resolve());
    Object.assign(mocked.project, {
      id: "project-1",
      title: "Project A",
      description: "Project A synopsis",
      projectPath: "/tmp/project-1.luie",
    });
    act(() => root.render(<PlotBoard />));
    await act(async () => Promise.resolve());

    retryA.resolve();
    await act(async () => retryA.promise);
    revisitALoad.resolve({
      columns: [{ id: "stale", title: "Stale Project A", cards: [] }],
    });
    await act(async () => revisitALoad.promise);
    const addAfterLoad = container.querySelector<HTMLButtonElement>(
      '[title="world.plot.addAct"]',
    );
    if (!addAfterLoad) throw new Error("revisited project A add button missing");
    act(() => addAfterLoad.click());
    await act(async () => flushSaveBuffers());

    expect(mocked.savePlot).toHaveBeenLastCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ title: "world.plot.newAct 2" }),
        ]),
      }),
    );
    expect(mocked.savePlot).not.toHaveBeenLastCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ id: "stale" }),
        ]),
      }),
    );
  });

  it("keeps an acknowledged pending synopsis over a late revisit load", async () => {
    const retryA = deferred();
    const revisitALoad = deferred<{
      synopsis: string;
      status: "draft";
      genre: string;
      targetAudience: string;
      logline: string;
    }>();
    mocked.loadSynopsis
      .mockResolvedValueOnce({
        synopsis: "Project A synopsis",
        status: "draft",
        genre: "Project A genre",
        targetAudience: "Project A audience",
        logline: "Project A logline",
      })
      .mockResolvedValueOnce({
        synopsis: "Project B synopsis",
        status: "draft",
        genre: "Project B genre",
        targetAudience: "",
        logline: "",
      })
      .mockReturnValueOnce(revisitALoad.promise);
    mocked.saveSynopsis
      .mockRejectedValueOnce(new Error("project A synopsis failed"))
      .mockReturnValueOnce(retryA.promise)
      .mockResolvedValueOnce(undefined);
    const { container, root } = mount(<SynopsisEditor />);
    await act(async () => Promise.resolve());
    const working = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "world.synopsis.status.working",
    );
    if (!working) throw new Error("project A working button missing");
    act(() => working.click());
    await act(async () => Promise.resolve());

    Object.assign(mocked.project, {
      id: "project-2",
      title: "Project B",
      description: "Project B synopsis",
      projectPath: "/tmp/project-2.luie",
    });
    act(() => root.render(<SynopsisEditor />));
    await act(async () => Promise.resolve());
    Object.assign(mocked.project, {
      id: "project-1",
      title: "Project A",
      description: "Project A synopsis",
      projectPath: "/tmp/project-1.luie",
    });
    act(() => root.render(<SynopsisEditor />));
    await act(async () => Promise.resolve());

    retryA.resolve();
    await act(async () => retryA.promise);
    revisitALoad.resolve({
      synopsis: "Stale synopsis",
      status: "draft",
      genre: "Stale genre",
      targetAudience: "",
      logline: "",
    });
    await act(async () => revisitALoad.promise);
    const locked = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "world.synopsis.status.locked",
    );
    if (!locked) throw new Error("revisited project A locked button missing");
    act(() => locked.click());
    await act(async () => flushSaveBuffers());

    expect(mocked.saveSynopsis).toHaveBeenLastCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        synopsis: "Project A synopsis",
        status: "locked",
        genre: "Project A genre",
        targetAudience: "Project A audience",
        logline: "Project A logline",
      }),
    );
  });

  it("preserves a failed plot button save after component unmount", async () => {
    const retry = deferred();
    mocked.savePlot
      .mockRejectedValueOnce(new Error("plot failed before unmount"))
      .mockReturnValueOnce(retry.promise);
    const { container, root } = mount(<PlotBoard />);
    await act(async () => Promise.resolve());
    const add = container.querySelector<HTMLElement>(
      '[title="world.plot.addAct"]',
    );
    if (!add) throw new Error("plot add button missing");
    act(() => add.click());
    await act(async () => Promise.resolve());
    act(() => root.unmount());
    roots.delete(root);

    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());
    expect(mocked.savePlot).toHaveBeenNthCalledWith(
      2,
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ title: "world.plot.newAct 2" }),
        ]),
      }),
    );
    expect(settled).toBe(false);
    retry.resolve();
    await act(async () => flush);
    expect(settled).toBe(true);
  });

  it("preserves a failed synopsis status save after component unmount", async () => {
    const retry = deferred();
    mocked.saveSynopsis
      .mockRejectedValueOnce(new Error("synopsis failed before unmount"))
      .mockReturnValueOnce(retry.promise);
    const { container, root } = mount(<SynopsisEditor />);
    await act(async () => Promise.resolve());
    const working = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "world.synopsis.status.working",
    );
    if (!working) throw new Error("working status button missing");
    act(() => working.click());
    await act(async () => Promise.resolve());
    act(() => root.unmount());
    roots.delete(root);

    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());
    expect(mocked.saveSynopsis).toHaveBeenNthCalledWith(
      2,
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({ status: "working" }),
    );
    expect(settled).toBe(false);
    retry.resolve();
    await act(async () => flush);
    expect(settled).toBe(true);
  });

  it("reports plot and synopsis load rejection without an unhandled promise", async () => {
    mocked.loadPlot.mockRejectedValueOnce(new Error("plot load failed"));
    mocked.loadSynopsis.mockRejectedValueOnce(new Error("synopsis load failed"));
    const plot = mount(<PlotBoard />);
    const synopsis = mount(<SynopsisEditor />);

    await act(async () => Promise.resolve());
    expect(mocked.showToast).toHaveBeenCalledTimes(2);
    expect(mocked.logWarn).toHaveBeenCalledTimes(2);
    expect(mocked.logWarn).toHaveBeenCalledWith(
      "Failed to load plot project scope",
      expect.objectContaining({ projectId: "project-1" }),
    );
    expect(mocked.logWarn).toHaveBeenCalledWith(
      "Failed to load synopsis project scope",
      expect.objectContaining({ projectId: "project-1" }),
    );
    const add = plot.container.querySelector<HTMLButtonElement>(
      '[title="world.plot.addAct"]',
    );
    const working = [...synopsis.container.querySelectorAll("button")].find(
      (button) => button.textContent === "world.synopsis.status.working",
    );
    if (!add || !working) throw new Error("hydration controls missing");
    expect(add.matches(":disabled")).toBe(true);
    expect(working.matches(":disabled")).toBe(true);
    act(() => {
      add.click();
      working.click();
    });
    await act(async () => flushSaveBuffers());
    expect(mocked.savePlot).not.toHaveBeenCalled();
    expect(mocked.saveSynopsis).not.toHaveBeenCalled();
  });
});
