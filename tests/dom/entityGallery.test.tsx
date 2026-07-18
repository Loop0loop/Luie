// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Calendar } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntityGallery } from "../../src/renderer/src/features/research/components/wiki/EntityGallery.js";

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

describe("EntityGallery", () => {
  it("filters grouped cards and selects an entity with a real button", () => {
    const onSelect = vi.fn();
    const { container } = mountView(
      <EntityGallery
        groups={{
          Main: [{ id: "event-1", name: "Opening", description: null }],
          Archive: [{ id: "event-2", name: "Closing", description: "Final scene" }],
        }}
        title="Event Overview"
        noDescriptionLabel="No Type"
        icon={Calendar}
        onSelect={onSelect}
      />,
    );

    expect(container.textContent).toContain("Event Overview");
    expect(container.textContent).toContain("Opening");
    expect(container.textContent).toContain("No Type");
    expect(container.textContent).toContain("Main");
    expect(container.textContent).toContain("Archive");

    act(() => {
      container
        .querySelector('button[data-entity-id="event-1"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith("event-1");

    const search = container.querySelector(
      'input[aria-label="Search Event Overview"]',
    ) as HTMLInputElement;
    expect(search).not.toBeNull();

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(search, "closing");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(container.textContent).toContain("Closing");
    expect(container.textContent).not.toContain("Opening");
    expect(container.textContent).not.toContain("Main");

    act(() => {
      container
        .querySelector('button[aria-label="List view"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(
      container.querySelector('[data-view-mode="list"]'),
    ).not.toBeNull();
  });

  it("reports a view change when the panel owns the gallery state", () => {
    const onViewModeChange = vi.fn();
    const { container } = mountView(
      <EntityGallery
        groups={{ Main: [{ id: "event-1", name: "Opening" }] }}
        title="Event Overview"
        noDescriptionLabel="No Type"
        icon={Calendar}
        onSelect={vi.fn()}
        viewMode="grid"
        onViewModeChange={onViewModeChange}
      />,
    );

    act(() => {
      container
        .querySelector('button[aria-label="List view"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onViewModeChange).toHaveBeenCalledWith("list");
  });
});
