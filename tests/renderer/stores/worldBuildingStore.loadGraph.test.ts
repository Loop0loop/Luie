// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorldBuildingStore } from "../../../src/renderer/src/features/research/stores/worldBuildingStore.js";
import type {
  EntityRelation,
  WorldGraphData,
  WorldGraphNode,
} from "../../../src/shared/types";

type IPCResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
  };
};

const mockedApi = vi.hoisted(() => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  worldGraph: {
    get: vi.fn(),
  },
  worldStorage: {
    getDocument: vi.fn(),
    setDocument: vi.fn(),
  },
}));

vi.mock("@shared/api", () => ({
  api: mockedApi,
}));

type ResettableStore = {
  getInitialState: () => unknown;
  setState: (state: unknown, replace?: boolean) => void;
};

const resetStore = (store: ResettableStore): void => {
  store.setState(store.getInitialState(), true);
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

describe("worldBuildingStore loadGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore(useWorldBuildingStore as unknown as ResettableStore);
  });

  it("preserves the current graph while reloading the same project", async () => {
    const graphDeferred = deferred<
      IPCResponse<{
        nodes: WorldGraphNode[];
        edges: EntityRelation[];
      }>
    >();
    const replicaDeferred = deferred<
      IPCResponse<{
        found: boolean;
        payload: unknown;
      }>
    >();

    mockedApi.worldGraph.get.mockReturnValue(graphDeferred.promise);
    mockedApi.worldStorage.getDocument.mockReturnValue(replicaDeferred.promise);

    const existingGraph: WorldGraphData = {
      nodes: [
        {
          id: "node-1",
          entityType: "Character",
          name: "Hero",
          description: null,
          firstAppearance: null,
          attributes: null,
          positionX: 10,
          positionY: 20,
        } satisfies WorldGraphNode,
      ],
      edges: [
        {
          id: "edge-1",
          projectId: "project-1",
          sourceId: "node-1",
          sourceType: "Character",
          targetId: "node-1",
          targetType: "Character",
          relation: "enemy_of",
          attributes: null,
          sourceWorldEntityId: null,
          targetWorldEntityId: null,
          createdAt: "2026-03-24T15:47:22.324Z",
          updatedAt: "2026-03-24T15:47:22.324Z",
        } satisfies EntityRelation,
      ],
      canvasBlocks: [],
      canvasEdges: [],
      timelines: [],
    };

    useWorldBuildingStore.setState({
      activeProjectId: "project-1",
      graphData: existingGraph,
      isLoading: false,
      error: null,
    });

    const loadPromise = useWorldBuildingStore.getState().loadGraph("project-1");

    expect(useWorldBuildingStore.getState().isLoading).toBe(true);
    expect(useWorldBuildingStore.getState().graphData).toBe(existingGraph);

    graphDeferred.resolve({
      success: true,
      data: {
        nodes: existingGraph.nodes,
        edges: existingGraph.edges,
      },
    });
    replicaDeferred.resolve({
      success: true,
      data: {
        found: false,
        payload: null,
      },
    });

    await loadPromise;

    expect(useWorldBuildingStore.getState().graphData).not.toBeNull();
    expect(useWorldBuildingStore.getState().graphData?.edges).toHaveLength(1);
  });

  it("clears stale graph data when switching projects", async () => {
    const graphDeferred = deferred<
      IPCResponse<{
        nodes: WorldGraphNode[];
        edges: EntityRelation[];
      }>
    >();
    const replicaDeferred = deferred<
      IPCResponse<{
        found: boolean;
        payload: unknown;
      }>
    >();

    mockedApi.worldGraph.get.mockReturnValue(graphDeferred.promise);
    mockedApi.worldStorage.getDocument.mockReturnValue(replicaDeferred.promise);

    const existingGraph: WorldGraphData = {
      nodes: [],
      edges: [],
      canvasBlocks: [],
      canvasEdges: [],
      timelines: [],
    };

    useWorldBuildingStore.setState({
      activeProjectId: "project-old",
      graphData: existingGraph,
      isLoading: false,
      error: null,
    });

    const loadPromise = useWorldBuildingStore.getState().loadGraph("project-new");

    expect(useWorldBuildingStore.getState().graphData).toBeNull();

    graphDeferred.resolve({
      success: true,
      data: {
        nodes: [],
        edges: [],
      },
    });
    replicaDeferred.resolve({
      success: true,
      data: {
        found: false,
        payload: null,
      },
    });

    await loadPromise;
  });
});
