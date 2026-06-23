// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { RestoreBackupDialog } from "../../src/renderer/src/features/workspace/components/project-selector/RestoreBackupDialog.js";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "settings.projectTemplate.restoreDialog.title":
          "Choose a saved version to restore",
        "settings.projectTemplate.restoreDialog.description":
          "Check the project name and save time first.",
        "settings.projectTemplate.restoreDialog.selectedLabel":
          "Selected saved version",
        "settings.projectTemplate.restoreDialog.projectLabel": "Project",
        "settings.projectTemplate.restoreDialog.savedAtLabel": "Saved at",
        "settings.projectTemplate.restoreDialog.chapterLabel":
          "Reference chapter",
        "settings.projectTemplate.restoreDialog.previewLabel": "Preview",
        "settings.projectTemplate.restoreDialog.prompt":
          "Restore this saved version as a new .luie file?",
        "settings.projectTemplate.restoreDialog.noChapter":
          "No chapter information",
        "settings.projectTemplate.restoreDialog.noPreview":
          "No preview available.",
        "settings.projectTemplate.restoreDialog.actions.refresh": "Refresh",
        "settings.projectTemplate.restoreDialog.actions.close": "Close",
        "settings.projectTemplate.restoreDialog.actions.restore":
          "Restore this version",
        "settings.projectTemplate.restoreDialog.actions.restoring":
          "Restoring...",
      })[key] ?? key,
  }),
}));

type MountedView = {
  container: HTMLDivElement;
  root: Root;
};

const mountView = (element: ReactNode): MountedView => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
};

const unmountView = ({ container, root }: MountedView): void => {
  act(() => {
    root.unmount();
  });
  container.remove();
};

const clickElement = async (element: Element | null): Promise<void> => {
  if (!element) {
    throw new Error("Element not found");
  }
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

describe("RestoreBackupDialog", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(unmountView);
    document.body.innerHTML = "";
  });

  it("shows project and saved-time context before restoring", async () => {
    const onRestore = vi.fn(async () => undefined);
    const candidates = [
      {
        snapshotId: "snapshot-1",
        projectId: "project-1",
        projectTitle: "Morning Draft",
        chapterTitle: "Chapter 1",
        savedAt: "2026-03-13T10:00:00.000Z",
        excerpt: "First saved version",
        filePath: "/tmp/morning.snap",
      },
      {
        snapshotId: "snapshot-2",
        projectId: "project-2",
        projectTitle: "Night Draft",
        chapterTitle: "Chapter 9",
        savedAt: "2026-03-13T11:00:00.000Z",
        excerpt: "Latest paragraph from the night draft",
        filePath: "/tmp/night.snap",
      },
    ];

    const view = mountView(
      <RestoreBackupDialog
        isOpen
        candidates={candidates}
        isLoading={false}
        isRestoring={false}
        error={null}
        onClose={() => undefined}
        onRefresh={() => undefined}
        onRestore={onRestore}
      />,
    );
    mountedViews.push(view);

    expect(view.container.textContent).toContain("Morning Draft");
    expect(view.container.textContent).toContain("Night Draft");

    await clickElement(
      view.container.querySelector(
        '[data-testid="restore-candidate-snapshot-2"]',
      ),
    );

    expect(view.container.textContent).toContain("Chapter 9");
    expect(view.container.textContent).toContain(
      "Latest paragraph from the night draft",
    );

    const restoreButton = Array.from(
      view.container.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Restore this version"));
    await clickElement(restoreButton ?? null);

    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotId: "snapshot-2",
        filePath: "/tmp/night.snap",
      }),
    );
  });
});
