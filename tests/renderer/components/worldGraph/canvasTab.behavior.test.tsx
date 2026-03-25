// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasTab } from "../../../../src/renderer/src/features/research/components/world/graph/tabs/CanvasTab.js";
import { buildEntityRelationHintEdgeId } from "../../../../src/renderer/src/features/research/components/world/graph/utils/canvasFlowUtils.js";
import { useWorldBuildingStore } from "../../../../src/renderer/src/features/research/stores/worldBuildingStore.js";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphData,
  WorldGraphNode,
} from "../../../../src/shared/types";

const mockedDialog = vi.hoisted(() => ({
  confirm: vi.fn(),
  toast: vi.fn(),
}));

let capturedCanvasViewProps: any = null;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock("@shared/ui/useDialog", () => ({
  useDialog: () => mockedDialog,
}));

vi.mock(
  "../../../../src/renderer/src/features/research/components/world/graph/views/CanvasView.js",
  () => ({
    CanvasView: (props: unknown) => {
      capturedCanvasViewProps = props;
      return null;
    },
  }),
);

type ResettableStore = {
  getInitialState: () => unknown;
  setState: (state: unknown, replace?: boolean) => void;
};

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const resetStore = (store: ResettableStore): void => {
  store.setState(store.getInitialState(), true);
};

const renderCanvasTab = (props: {
  projectId: string | null;
  graphNodes: WorldGraphNode[];
  graphEdges: EntityRelation[];
  graphCanvasBlocks: WorldGraphCanvasBlock[];
  graphCanvasEdges: WorldGraphCanvasEdge[];
}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <CanvasTab
        projectId={props.projectId}
        graphNodes={props.graphNodes}
        graphEdges={props.graphEdges}
        graphCanvasBlocks={props.graphCanvasBlocks}
        graphCanvasEdges={props.graphCanvasEdges}
        selectedNodeId={null}
        autoLayoutTrigger={0}
        onSelectNode={vi.fn()}
        onCreatedEntity={vi.fn()}
      />,
    );
  });

  if (!capturedCanvasViewProps) {
    throw new Error("CanvasView props were not captured");
  }

  return { container, root, props: capturedCanvasViewProps as any };
};

const unmountView = ({ container, root }: MountedView): void => {
  act(() => {
    root.unmount();
  });
  container.remove();
};

describe("CanvasTab behavior", () => {
  const mountedViews: MountedView[] = [];
  const now = new Date("2026-03-24T15:47:22.324Z");

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    capturedCanvasViewProps = null;
    mockedDialog.confirm.mockReset();
    mockedDialog.toast.mockReset();
    mockedDialog.confirm.mockResolvedValue(true);
    resetStore(useWorldBuildingStore as unknown as ResettableStore);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(unmountView);
    document.body.innerHTML = "";
  });

  it("deletes a node without pre-saving incident canvas edges", async () => {
    const deleteGraphNode = vi.fn(async () => true);
    const setGraphCanvasEdges = vi.fn(async () => undefined);

    useWorldBuildingStore.setState({
      activeProjectId: "project-1",
      graphData: {
        nodes: [
          {
            id: "node-1",
            entityType: "Character",
            name: "Hero",
            positionX: 0,
            positionY: 0,
          } satisfies WorldGraphNode,
        ],
        edges: [],
        canvasBlocks: [],
        canvasEdges: [
          {
            id: "canvas-edge-1",
            sourceId: "node-1",
            targetId: "node-2",
            relation: "related",
            direction: "unidirectional",
          } satisfies WorldGraphCanvasEdge,
        ],
      } satisfies WorldGraphData,
      deleteGraphNode,
      setGraphCanvasEdges,
    });

    const view = renderCanvasTab({
      projectId: "project-1",
      graphNodes: [
        {
          id: "node-1",
          entityType: "Character",
          name: "Hero",
          positionX: 0,
          positionY: 0,
        } satisfies WorldGraphNode,
      ],
      graphEdges: [],
      graphCanvasBlocks: [],
      graphCanvasEdges: [
        {
          id: "canvas-edge-1",
          sourceId: "node-1",
          targetId: "node-2",
          relation: "related",
          direction: "unidirectional",
        } satisfies WorldGraphCanvasEdge,
      ],
    });
    mountedViews.push(view);

    await act(async () => {
      await view.props.onDeleteNode("node-1");
    });

    expect(mockedDialog.confirm).not.toHaveBeenCalled();
    expect(deleteGraphNode).toHaveBeenCalledTimes(1);
    expect(setGraphCanvasEdges).not.toHaveBeenCalled();
  });

  it("re-reads the latest canvas edges after async relation creation", async () => {
    const createRelationDeferred = deferred<EntityRelation>();
    const setGraphCanvasEdges = vi.fn(async () => undefined);
    const staleCanvasEdges: WorldGraphCanvasEdge[] = [
      {
        id: "stale-edge",
        sourceId: "node-1",
        targetId: "node-2",
        relation: "related",
        direction: "unidirectional",
      },
    ];
    const latestCanvasEdges: WorldGraphCanvasEdge[] = [
      {
        id: "latest-edge",
        sourceId: "node-2",
        targetId: "node-3",
        relation: "related",
        direction: "unidirectional",
      },
    ];

    useWorldBuildingStore.setState({
      activeProjectId: "project-1",
      graphData: {
        nodes: [
          {
            id: "node-1",
            entityType: "Character",
            name: "Hero",
            positionX: 0,
            positionY: 0,
          } satisfies WorldGraphNode,
          {
            id: "node-2",
            entityType: "Event",
            name: "Inciting Incident",
            positionX: 0,
            positionY: 0,
          } satisfies WorldGraphNode,
        ],
        edges: [],
        canvasBlocks: [],
        canvasEdges: staleCanvasEdges,
      } satisfies WorldGraphData,
      createRelation: vi.fn(async () => createRelationDeferred.promise),
      setGraphCanvasEdges,
    });

    const view = renderCanvasTab({
      projectId: "project-1",
      graphNodes: [
        {
          id: "node-1",
          entityType: "Character",
          name: "Hero",
          positionX: 0,
          positionY: 0,
        } satisfies WorldGraphNode,
        {
          id: "node-2",
          entityType: "Event",
          name: "Inciting Incident",
          positionX: 0,
          positionY: 0,
        } satisfies WorldGraphNode,
      ],
      graphEdges: [],
      graphCanvasBlocks: [],
      graphCanvasEdges: staleCanvasEdges,
    });
    mountedViews.push(view);

    const createPromise = act(async () =>
      view.props.onCreateCanvasRelation({
        sourceId: "node-1",
        targetId: "node-2",
        sourceHandle: "right-out",
        targetHandle: "left-in",
      }),
    );

    useWorldBuildingStore.setState((state) => ({
      ...state,
      graphData: {
        ...(state.graphData as WorldGraphData),
        canvasEdges: latestCanvasEdges,
      },
    }));

    createRelationDeferred.resolve({
      id: "rel-1",
      projectId: "project-1",
      sourceId: "node-1",
      sourceType: "Character",
      targetId: "node-2",
      targetType: "Event",
      relation: "belongs_to",
      createdAt: now,
      updatedAt: now,
    });

    await createPromise;

    expect(setGraphCanvasEdges).toHaveBeenCalledTimes(1);
    expect(setGraphCanvasEdges).toHaveBeenCalledWith([
      ...latestCanvasEdges,
      {
        id: buildEntityRelationHintEdgeId("rel-1"),
        sourceId: "node-1",
        sourceHandle: "r-source",
        targetId: "node-2",
        targetHandle: "l-target",
        relation: "",
        direction: "none",
      },
    ]);
  });

  it("normalizes target->source drag into a valid relation and hint", async () => {
    const setGraphCanvasEdges = vi.fn(async () => undefined);
    const createRelation = vi.fn(async () => ({
      id: "rel-2",
      projectId: "project-1",
      sourceId: "node-2",
      sourceType: "Event",
      targetId: "node-1",
      targetType: "Character",
      relation: "belongs_to",
      createdAt: now,
      updatedAt: now,
    }));

    useWorldBuildingStore.setState({
      activeProjectId: "project-1",
      graphData: {
        nodes: [
          {
            id: "node-1",
            entityType: "Character",
            name: "Hero",
            positionX: 0,
            positionY: 0,
          } satisfies WorldGraphNode,
          {
            id: "node-2",
            entityType: "Event",
            name: "Incident",
            positionX: 0,
            positionY: 0,
          } satisfies WorldGraphNode,
        ],
        edges: [],
        canvasBlocks: [],
        canvasEdges: [],
      } satisfies WorldGraphData,
      createRelation,
      setGraphCanvasEdges,
    });

    const view = renderCanvasTab({
      projectId: "project-1",
      graphNodes: [
        {
          id: "node-1",
          entityType: "Character",
          name: "Hero",
          positionX: 0,
          positionY: 0,
        } satisfies WorldGraphNode,
        {
          id: "node-2",
          entityType: "Event",
          name: "Incident",
          positionX: 0,
          positionY: 0,
        } satisfies WorldGraphNode,
      ],
      graphEdges: [],
      graphCanvasBlocks: [],
      graphCanvasEdges: [],
    });
    mountedViews.push(view);

    await act(async () => {
      await view.props.onCreateCanvasRelation({
        sourceId: "node-1",
        targetId: "node-2",
        sourceHandle: "l-target",
        targetHandle: "r-source",
      });
    });

    expect(createRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: "node-2",
        targetId: "node-1",
      }),
    );
    expect(setGraphCanvasEdges).toHaveBeenCalledWith([
      {
        id: buildEntityRelationHintEdgeId("rel-2"),
        sourceId: "node-2",
        sourceHandle: "r-source",
        targetId: "node-1",
        targetHandle: "l-target",
        relation: "",
        direction: "none",
      },
    ]);
  });

  it("appends timeline branches from the latest canvas snapshot", async () => {
    const setGraphCanvasBlocks = vi.fn(async () => undefined);
    const setGraphCanvasEdges = vi.fn(async () => undefined);
    const latestCanvasBlocks: WorldGraphCanvasBlock[] = [
      {
        id: "timeline-1",
        type: "timeline",
        positionX: 10,
        positionY: 20,
        data: { content: "First", isHeld: false, color: "#123456" },
      },
      {
        id: "timeline-2",
        type: "timeline",
        positionX: 30,
        positionY: 40,
        data: { content: "Second", isHeld: false },
      },
    ];
    const latestCanvasEdges: WorldGraphCanvasEdge[] = [
      {
        id: "edge-1",
        sourceId: "timeline-1",
        targetId: "timeline-2",
        relation: "next",
        direction: "unidirectional",
      },
    ];

    useWorldBuildingStore.setState({
      activeProjectId: "project-1",
      graphData: {
        nodes: [],
        edges: [],
        canvasBlocks: latestCanvasBlocks,
        canvasEdges: latestCanvasEdges,
      } satisfies WorldGraphData,
      createGraphNode: vi.fn(async () => null),
      createRelation: vi.fn(async () => null),
      deleteGraphNode: vi.fn(async () => true),
      deleteRelation: vi.fn(async () => true),
      setGraphCanvasBlocks,
      setGraphCanvasEdges,
    });

    const view = renderCanvasTab({
      projectId: "project-1",
      graphNodes: [],
      graphEdges: [],
      graphCanvasBlocks: latestCanvasBlocks.slice(0, 1),
      graphCanvasEdges: [],
    });
    mountedViews.push(view);

    await act(async () => {
      await view.props.onAddTimelineBranch("timeline-1", "right");
    });

    expect(setGraphCanvasBlocks).toHaveBeenCalledTimes(1);
    const blocksArg = setGraphCanvasBlocks.mock.calls[0][0] as WorldGraphCanvasBlock[];
    expect(blocksArg.slice(0, latestCanvasBlocks.length)).toEqual(
      latestCanvasBlocks,
    );

    expect(setGraphCanvasEdges).toHaveBeenCalledTimes(1);
    const edgesArg = setGraphCanvasEdges.mock.calls[0][0] as WorldGraphCanvasEdge[];
    expect(edgesArg.slice(0, latestCanvasEdges.length)).toEqual(
      latestCanvasEdges,
    );
    expect(edgesArg).toHaveLength(latestCanvasEdges.length + 1);
    expect(edgesArg.at(-1)).toMatchObject({
      sourceId: "timeline-1",
      targetId: expect.any(String),
      relation: "next",
      direction: "unidirectional",
      color: "#123456",
    });
  });

  it("creates graph branches with an event default name", async () => {
    const createGraphNode = vi.fn(async () => ({
      id: "event-branch-1",
      entityType: "Event",
      name: "New Event",
      positionX: 0,
      positionY: 0,
    } satisfies WorldGraphNode));
    const createRelation = vi.fn(async () => null);
    const setGraphCanvasEdges = vi.fn(async () => undefined);

    useWorldBuildingStore.setState({
      activeProjectId: "project-1",
      graphData: {
        nodes: [
          {
            id: "node-1",
            entityType: "Character",
            name: "Hero",
            positionX: 100,
            positionY: 120,
          } satisfies WorldGraphNode,
        ],
        edges: [],
        canvasBlocks: [],
        canvasEdges: [],
      } satisfies WorldGraphData,
      createGraphNode,
      createRelation,
      deleteGraphNode: vi.fn(async () => true),
      deleteRelation: vi.fn(async () => true),
      setGraphCanvasEdges,
    });

    const view = renderCanvasTab({
      projectId: "project-1",
      graphNodes: [
        {
          id: "node-1",
          entityType: "Character",
          name: "Hero",
          positionX: 100,
          positionY: 120,
        } satisfies WorldGraphNode,
      ],
      graphEdges: [],
      graphCanvasBlocks: [],
      graphCanvasEdges: [],
    });
    mountedViews.push(view);

    await act(async () => {
      await view.props.onAddTimelineBranch("node-1", "right");
    });

    expect(createGraphNode).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "Event",
        name: "New Event",
      }),
    );
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
