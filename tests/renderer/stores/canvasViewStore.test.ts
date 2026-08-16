import { beforeEach, describe, expect, it } from "vitest";
import { useCanvasViewStore } from "../../../src/renderer/src/features/canvas/stores/canvasViewStore";

describe("canvasViewStore entity preview", () => {
  beforeEach(() => {
    useCanvasViewStore.setState({
      activePanel: "explorer",
      entityPreview: null,
      isActivityCollapsed: false,
      selection: { kind: "none" },
    });
  });

  it("opens entity previews inside the canvas surface", () => {
    useCanvasViewStore.getState().openEntityPreview({
      kind: "character",
      id: "character-1",
    });

    expect(useCanvasViewStore.getState().entityPreview).toEqual({
      kind: "character",
      id: "character-1",
    });
    expect(useCanvasViewStore.getState().activePanel).toBe("canvas");
    expect(useCanvasViewStore.getState().selection).toEqual({ kind: "none" });
  });

  it("clears entity preview when the graph selection changes", () => {
    useCanvasViewStore.getState().openEntityPreview({
      kind: "event",
      id: "event-1",
    });

    useCanvasViewStore.getState().selectNode("character-1");

    expect(useCanvasViewStore.getState().entityPreview).toBeNull();
    expect(useCanvasViewStore.getState().selection).toEqual({
      kind: "node",
      id: "character-1",
    });
  });

  it("clears entity preview when switching to graph mode", () => {
    useCanvasViewStore.getState().openEntityPreview({
      kind: "faction",
      id: "faction-1",
    });

    useCanvasViewStore.getState().setActivePanel("graph");

    expect(useCanvasViewStore.getState().entityPreview).toBeNull();
    expect(useCanvasViewStore.getState().activePanel).toBe("graph");
  });
});
