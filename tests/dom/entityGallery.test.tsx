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
  it("renders grouped entities and selects an item", () => {
    const onSelect = vi.fn();
    const { container } = mountView(
      <EntityGallery
        groups={{
          Main: [{ id: "event-1", name: "Opening", description: null }],
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

    act(() => {
      container
        .querySelector(".cursor-pointer")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith("event-1");
  });
});
