// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: 시작 위저드가 A(인트로, 고정 dark bootstrap) → B(테마, 창 리사이즈 + 라이브
// theme 속성) → B-3(레이아웃) → 완료(EditorSettings 저장 + readiness 완료)로 진행한다.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  setStartupWizardSize: vi.fn(async () => undefined),
  getEditor: vi.fn(async () => ({ success: true, data: null })),
  setEditor: vi.fn(async () => ({ success: true, data: null })),
  getReadiness: vi.fn(async () => ({ success: true, data: null })),
  completeWizard: vi.fn(async () => ({ success: true, data: null })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@shared/api", () => ({
  api: {
    settings: {
      getEditor: mocked.getEditor,
      setEditor: mocked.setEditor,
    },
    window: {
      setStartupWizardSize: mocked.setStartupWizardSize,
    },
    startup: {
      getReadiness: mocked.getReadiness,
      completeWizard: mocked.completeWizard,
    },
  },
}));

import StartupWizard from "../../src/renderer/src/features/startup/components/StartupWizard.js";

const baseEditorSettings = {
  theme: "sepia",
  themeContrast: "soft",
  themeTemp: "warm",
  themeAccent: "rose",
  uiMode: "default",
};

const findButton = (root: Root, text: string): HTMLButtonElement => {
  const container = (root as unknown as { _internalRoot: { containerInfo: HTMLElement } })
    ._internalRoot.containerInfo;
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === text,
  );
  if (!button) throw new Error(`button not found: ${text}`);
  return button;
};

const renderWizard = async (): Promise<{ root: Root; container: HTMLElement }> => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<StartupWizard />);
  });
  return { root, container };
};

describe("startup wizard flow", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-temp");
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.removeAttribute("data-contrast");

    mocked.getEditor.mockResolvedValue({
      success: true,
      data: { ...baseEditorSettings },
    });
    mocked.getReadiness.mockResolvedValue({
      success: true,
      data: {
        mustRunWizard: true,
        checks: [],
        reasons: [],
        completedAt: null,
      },
    });
    mocked.completeWizard.mockResolvedValue({
      success: true,
      data: {
        mustRunWizard: false,
        checks: [],
        reasons: [],
        completedAt: "2026-09-01T00:00:00.000Z",
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  });

  it("인트로(A)는 고정 dark bootstrap 위에 뜨고 아이콘 없이 제목과 CTA만 있다", async () => {
    const { root, container } = await renderWizard();

    expect(container.textContent).toContain("startupWizard.onboarding.startTitle");
    expect(container.textContent).toContain("startupWizard.onboarding.startCta");
    expect(container.querySelector("svg")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    const unmount = () => root.unmount();
    act(() => {
      unmount();
    });
  });

  it("시작하기를 누르면 가로형으로 창을 확장하고 저장된 테마를 documentElement에 반영한다", async () => {
    const { root, container } = await renderWizard();

    await act(async () => {
      findButton(root, "startupWizard.onboarding.startCta").click();
    });

    expect(mocked.setStartupWizardSize).toHaveBeenCalledWith(760, 600);
    expect(container.textContent).toContain("startupWizard.onboarding.themeTitle");
    expect(mocked.getEditor).toHaveBeenCalled();
    expect(document.documentElement.getAttribute("data-theme")).toBe("sepia");
    expect(document.documentElement.getAttribute("data-temp")).toBe("warm");
    expect(document.documentElement.getAttribute("data-accent")).toBe("rose");

    const unmount = () => root.unmount();
    act(() => {
      unmount();
    });
  });

  it("테마 카드는 라이브로 data-theme을 바꾸고, 완료 시 EditorSettings에 저장된다", async () => {
    const { root, container } = await renderWizard();

    await act(async () => {
      findButton(root, "startupWizard.onboarding.startCta").click();
    });
    await act(async () => {
      findButton(root, "startupWizard.onboarding.themeDark").click();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await act(async () => {
      findButton(root, "startupWizard.onboarding.next").click();
    });
    expect(container.textContent).toContain(
      "startupWizard.onboarding.layoutTitle",
    );

    await act(async () => {
      findButton(root, "startupWizard.onboarding.layoutScrivener").click();
    });
    await act(async () => {
      findButton(root, "startupWizard.onboarding.finish").click();
    });

    expect(mocked.setEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        ...baseEditorSettings,
        theme: "dark",
        uiMode: "scrivener",
      }),
    );
    expect(mocked.getReadiness).toHaveBeenCalled();
    expect(mocked.completeWizard).toHaveBeenCalled();
    expect(container.textContent).toContain(
      "startupWizard.onboarding.finishing",
    );

    const unmount = () => root.unmount();
    act(() => {
      unmount();
    });
  });
});
