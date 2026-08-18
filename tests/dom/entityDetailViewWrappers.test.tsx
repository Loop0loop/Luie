// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import EventDetailView from "../../src/renderer/src/features/research/components/event/EventDetailView.js";
import FactionDetailView from "../../src/renderer/src/features/research/components/faction/FactionDetailView.js";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock("@shared/ui/useDialog", () => ({
  useDialog: () => ({
    confirm: vi.fn(),
  }),
}));

vi.mock("@renderer/features/research/stores/eventStore", () => ({
  useEventStore: (selector: (state: unknown) => unknown) =>
    selector({
      currentItem: null,
      updateEvent: vi.fn(),
      loadEvent: vi.fn(),
    }),
}));

const factionStoreState = {
  currentItem: null as { id: string; name: string; description: string } | null,
  updateFaction: vi.fn(),
  loadFaction: vi.fn(),
};

vi.mock("@renderer/features/research/stores/factionStore", () => ({
  useFactionStore: (selector: (state: unknown) => unknown) =>
    selector(factionStoreState),
}));

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountedViews: MountedView[] = [];

const mountView = (element: React.ReactNode): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  const view = { container, root };
  mountedViews.push(view);
  return view;
};

afterEach(() => {
  for (const { container, root } of mountedViews.splice(0)) {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});

describe("entity detail wrappers", () => {
  it("keeps event no-selection rendering through the shared detail view", () => {
    const { container } = mountView(<EventDetailView />);

    expect(container.textContent).toContain("No Event Selected");
  });

  it("keeps faction no-selection rendering through the shared detail view", () => {
    const { container } = mountView(<FactionDetailView />);

    expect(container.textContent).toContain("No Faction Selected");
  });

  it("keeps Hook order when a faction loads after the empty state", () => {
    const { container, root } = mountView(<FactionDetailView factionId="faction-1" />);

    factionStoreState.currentItem = {
      id: "faction-1",
      name: "The Guild",
      description: "Alliance",
    };
    act(() => {
      root.render(<FactionDetailView factionId="faction-1" />);
    });

    expect(container.textContent).toContain("The Guild");
  });
});
