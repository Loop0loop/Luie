// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimelineMainView } from "../../src/renderer/src/features/research/components/world/graph/views/TimelineMainView.js";
import { useWorldGraphUiStore } from "../../src/renderer/src/features/research/stores/worldGraphUiStore.js";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) =>
      typeof fallback === "string" ? fallback : _key,
  }),
}));

vi.mock("@shared/ui/ToastContext", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock(
  "../../src/renderer/src/features/research/components/world/graph/scene/useTimelineActions.js",
  () => ({
    useTimelineActions: () => ({
      createRootEvent: vi.fn(),
    }),
  }),
);

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountView = (): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <TimelineMainView
        nodes={[
          {
            id: "event-1",
            entityType: "Event",
            subType: undefined,
            name: "붉은 밤",
            description: "왕국의 전환점",
            firstAppearance: "왕국력 10년",
            attributes: null,
            positionX: 0,
            positionY: 0,
          },
        ]}
        edges={[]}
      />,
    );
  });

  return { container, root };
};

describe("TimelineMainView", () => {
  let mountedView: MountedView | null = null;

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    useWorldGraphUiStore.setState(useWorldGraphUiStore.getInitialState(), true);
    useWorldGraphUiStore.setState({ activeTab: "timeline" });
  });

  afterEach(() => {
    if (mountedView) {
      act(() => {
        mountedView?.root.unmount();
      });
      mountedView.container.remove();
      mountedView = null;
    }
    document.body.innerHTML = "";
  });

  it("keeps the timeline tab active when selecting an event entry", () => {
    mountedView = mountView();

    const button = Array.from(mountedView.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.includes("붉은 밤"),
    );
    expect(button).not.toBeUndefined();

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(useWorldGraphUiStore.getState().selectedNodeId).toBe("event-1");
    expect(useWorldGraphUiStore.getState().activeTab).toBe("timeline");
  });
});
