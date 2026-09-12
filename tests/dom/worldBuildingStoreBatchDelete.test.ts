// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorldGraphData, WorldGraphNode } from "../../src/shared/types";
import { useWorldBuildingStore } from "../../src/renderer/src/features/research/stores/worldBuildingStore.js";

const mocked = vi.hoisted(() => ({
  api: {
    character: { delete: vi.fn() },
    event: { delete: vi.fn() },
    faction: { delete: vi.fn() },
    term: { delete: vi.fn() },
    worldEntity: { delete: vi.fn() },
    entityRelation: { delete: vi.fn() },
    worldStorage: { setDocument: vi.fn() },
    logger: { error: vi.fn() },
  },
  clearGraphBackedSelection: vi.fn(),
  syncGraphBackedStore: vi.fn(),
}));

vi.mock("@shared/api", () => ({ api: mocked.api }));
vi.mock("@renderer/features/research/utils/graphEntitySync", () => ({
  clearGraphBackedSelection: mocked.clearGraphBackedSelection,
  syncGraphBackedStore: mocked.syncGraphBackedStore,
}));

type ResettableStore = {
  getInitialState: () => unknown;
  setState: (state: unknown, replace?: boolean) => void;
};

const resetStore = (store: ResettableStore): void => {
  store.setState(store.getInitialState(), true);
};

const graphData: WorldGraphData = {
  nodes: [
    {
      id: "character-1",
      entityType: "Character",
      name: "One",
      attributes: null,
      positionX: 0,
      positionY: 0,
    },
    {
      id: "character-2",
      entityType: "Character",
      name: "Two",
      attributes: null,
      positionX: 20,
      positionY: 20,
    },
    {
      id: "event-1",
      entityType: "Event",
      name: "Event",
      attributes: null,
      positionX: 40,
      positionY: 40,
    },
  ] satisfies WorldGraphNode[],
  edges: [
    {
      id: "relation-1",
      projectId: "project-1",
      sourceId: "character-1",
      sourceType: "Character",
      targetId: "event-1",
      targetType: "Event",
      relation: "belongs_to",
      attributes: null,
      sourceWorldEntityId: null,
      targetWorldEntityId: null,
      createdAt: "2026-09-11T00:00:00.000Z",
      updatedAt: "2026-09-11T00:00:00.000Z",
    },
    {
      id: "relation-2",
      projectId: "project-1",
      sourceId: "character-2",
      sourceType: "Character",
      targetId: "event-1",
      targetType: "Event",
      relation: "belongs_to",
      attributes: null,
      sourceWorldEntityId: null,
      targetWorldEntityId: null,
      createdAt: "2026-09-11T00:00:00.000Z",
      updatedAt: "2026-09-11T00:00:00.000Z",
    },
  ],
  canvasBlocks: [],
  canvasEdges: [],
  canvasFiles: [],
  timelines: [],
};

describe("worldBuildingStore batch deletes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore(useWorldBuildingStore as unknown as ResettableStore);
    mocked.api.character.delete.mockResolvedValue({ success: true });
    mocked.api.entityRelation.delete.mockResolvedValue({ success: true });
    mocked.api.worldStorage.setDocument.mockResolvedValue({ success: true });
    mocked.syncGraphBackedStore.mockResolvedValue(undefined);
    useWorldBuildingStore.setState({
      activeProjectId: "project-1",
      graphData,
    });
  });

  it("persists a multi-node deletion once and refreshes each backing store once", async () => {
    await useWorldBuildingStore
      .getState()
      .deleteGraphNodes(["character-1", "character-2"]);

    expect(mocked.api.character.delete).toHaveBeenCalledTimes(2);
    expect(useWorldBuildingStore.getState().graphData).toMatchObject({
      nodes: [{ id: "event-1" }],
      edges: [],
    });
    expect(mocked.syncGraphBackedStore).toHaveBeenCalledTimes(1);
    expect(mocked.syncGraphBackedStore).toHaveBeenCalledWith(
      "Character",
      "project-1",
    );
    expect(mocked.api.worldStorage.setDocument).toHaveBeenCalledTimes(1);
  });

  it("persists a multi-relation deletion once", async () => {
    await useWorldBuildingStore
      .getState()
      .deleteRelations(["relation-1", "relation-2"]);

    expect(mocked.api.entityRelation.delete).toHaveBeenCalledTimes(2);
    expect(useWorldBuildingStore.getState().graphData?.edges).toEqual([]);
    expect(mocked.api.worldStorage.setDocument).toHaveBeenCalledTimes(1);
  });
});
