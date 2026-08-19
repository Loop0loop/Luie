// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import InspectorPanel from "../../src/renderer/src/features/editor/components/InspectorPanel.js";

const chapterStoreState = vi.hoisted(() => ({
  items: [] as Array<{ id: string; title: string; synopsis?: string }>,
  update: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock("@renderer/features/manuscript/stores/chapterStore", () => ({
  useChapterStore: (selector: (state: typeof chapterStoreState) => unknown) =>
    selector(chapterStoreState),
}));

const mounted: Array<{ container: HTMLDivElement; root: Root }> = [];

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
  chapterStoreState.items = [];
  chapterStoreState.update.mockClear();
});

describe("InspectorPanel", () => {
  it("syncs synopsis when the selected chapter arrives asynchronously", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mounted.push({ container, root });

    act(() => {
      root.render(<InspectorPanel activeChapterId="chapter-1" />);
    });

    chapterStoreState.items = [
      { id: "chapter-1", title: "Chapter 1", synopsis: "Loaded synopsis" },
    ];
    act(() => {
      root.render(<InspectorPanel activeChapterId="chapter-1" />);
    });

    expect((container.querySelector("textarea") as HTMLTextAreaElement | null)?.value).toBe(
      "Loaded synopsis",
    );
  });
});
