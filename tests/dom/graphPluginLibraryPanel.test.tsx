// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { GraphPluginLibraryPanel } from "../../src/renderer/src/features/research/components/world/graph/views/GraphPluginLibraryPanel.js";
import { useGraphPluginStore } from "../../src/renderer/src/features/research/stores/graphPluginStore.js";

const mocked = vi.hoisted(() => {
  let installed = false;
  let installResolver: (() => void) | null = null;
  const loadGraph = vi.fn(async () => undefined);
  const showToast = vi.fn();
  const confirm = vi.fn(async () => true);
  const applyTemplate = vi.fn(async () => ({
    success: true,
  }));

  const catalog = [
    {
      pluginId: "foundation-graph",
      version: "1.0.0",
      name: "Foundation Graph",
      summary: "Starter graph templates",
      releaseTag: "foundation-graph-v1.0.0",
      assetUrl: "https://example.com/foundation-graph.zip",
      sha256: "6c35bae2692844f5008856f3a50562e88d2afc6c91d2ecb78b85b65c1151713c",
      size: 1925,
      minAppVersion: "0.1.16",
      apiVersion: "1.0.0",
    },
  ];

  const template = {
    pluginId: "foundation-graph",
    pluginName: "Foundation Graph",
    pluginVersion: "1.0.0",
    pluginDescription: "Starter graph templates",
    pluginAuthor: "Luie Team",
    template: {
      id: "kingdom-foundation",
      title: "Kingdom Foundation",
      summary: "Starter graph",
      thumbnail: "assets/thumb.svg",
      graphEntry: "templates/kingdom.graph.json",
      tags: ["starter"],
    },
  };

  return {
    get installed() {
      return installed;
    },
    set installed(value: boolean) {
      installed = value;
    },
    setInstallResolver(resolver: (() => void) | null) {
      installResolver = resolver;
    },
    resolveInstall() {
      installResolver?.();
      installResolver = null;
    },
    loadGraph,
    showToast,
    confirm,
    applyTemplate,
    pluginApi: {
      listCatalog: vi.fn(async () => ({
        success: true,
        data: catalog,
      })),
      listInstalled: vi.fn(async () => ({
        success: true,
        data: installed
          ? [
              {
                pluginId: "foundation-graph",
                version: "1.0.0",
                name: "Foundation Graph",
                description: "Starter graph templates",
                author: "Luie Team",
                apiVersion: "1.0.0",
                kind: "graph-template-bundle",
                installedAt: "2026-03-15T00:00:00.000Z",
                source: {
                  assetUrl: "https://example.com/foundation-graph.zip",
                  sha256:
                    "6c35bae2692844f5008856f3a50562e88d2afc6c91d2ecb78b85b65c1151713c",
                },
                status: "installed",
              },
            ]
          : [],
      })),
      getTemplates: vi.fn(async () => ({
        success: true,
        data: installed ? [template] : [],
      })),
      install: vi.fn(
        () =>
          new Promise((resolve) => {
            installResolver = () => {
              installed = true;
              resolve({
                success: true,
                data: {
                  pluginId: "foundation-graph",
                  version: "1.0.0",
                  installedAt: "2026-03-15T00:00:00.000Z",
                  status: "installed",
                  alreadyInstalled: false,
                },
              });
            };
          }),
      ),
      uninstall: vi.fn(async () => ({
        success: true,
      })),
      applyTemplate: vi.fn(async (input) => {
        applyTemplate(input);
        return { success: true };
      }),
    },
  };
});

vi.mock("@shared/api", () => ({
  api: {
    plugin: mocked.pluginApi,
  },
}));

vi.mock("@shared/ui/useDialog", () => ({
  useDialog: () => ({
    confirm: mocked.confirm,
    prompt: vi.fn(),
    toast: mocked.showToast,
  }),
}));

vi.mock("@shared/ui/ToastContext", () => ({
  useToast: () => ({
    showToast: mocked.showToast,
  }),
}));

vi.mock(
  "@renderer/features/research/stores/worldBuildingStore",
  () => ({
    useWorldBuildingStore: (selector: (state: { loadGraph: typeof mocked.loadGraph }) => unknown) =>
      selector({ loadGraph: mocked.loadGraph }),
  }),
);

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

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe("GraphPluginLibraryPanel", () => {
  const mountedViews: MountedView[] = [];

  beforeEach(() => {
    mocked.installed = false;
    mocked.setInstallResolver(null);
    mocked.loadGraph.mockClear();
    mocked.showToast.mockClear();
    mocked.confirm.mockClear();
    mocked.applyTemplate.mockClear();
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    useGraphPluginStore.setState({
      catalog: [],
      installed: [],
      templates: [],
      error: null,
      hasLoaded: false,
      isLoading: false,
      installingPluginId: null,
      uninstallingPluginId: null,
      applyingTemplateKey: null,
    });
  });

  afterEach(() => {
    mountedViews.splice(0).forEach(unmountView);
    document.body.innerHTML = "";
  });

  it("renders installed/available sections, shows install progress, and applies templates", async () => {
    const view = mountView(
      <GraphPluginLibraryPanel projectId="7d3ec34f-c546-4c9c-bf19-b7986f88c6a9" />,
    );
    mountedViews.push(view);

    await flushPromises();

    expect(view.container.textContent).toContain("Installed Plugins");
    expect(view.container.textContent).toContain("Available Plugins");
    expect(view.container.textContent).toContain("Foundation Graph");

    const installButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Install"),
    );
    expect(installButton).toBeTruthy();

    await act(async () => {
      installButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Installing...");

    await act(async () => {
      mocked.resolveInstall();
      await Promise.resolve();
    });
    await flushPromises();

    expect(view.container.textContent).toContain("Kingdom Foundation");

    const applyButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Apply"),
    );
    expect(applyButton).toBeTruthy();

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(mocked.confirm).toHaveBeenCalledTimes(1);
    expect(mocked.pluginApi.applyTemplate).toHaveBeenCalledWith({
      pluginId: "foundation-graph",
      templateId: "kingdom-foundation",
      projectId: "7d3ec34f-c546-4c9c-bf19-b7986f88c6a9",
    });
    expect(mocked.loadGraph).toHaveBeenCalledWith(
      "7d3ec34f-c546-4c9c-bf19-b7986f88c6a9",
    );
  });
});
