// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: 시작 위저드가 A(인트로) → A'(모델, 창 크기 유지 — 상세는
// startupWizardModelStep.test.tsx) → B(테마, 창 리사이즈) → B-3(레이아웃) →
// 완료 대기 → 프로젝트 준비 → 완료(completeWizard)로 진행한다. completeWizard는
// 메인 창 플로우를 여는 신호라 반드시 마지막에 호출된다.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogProvider } from "../../src/shared/ui/DialogProvider.js";
import { ToastProvider } from "../../src/shared/ui/Toast.js";

const mocked = vi.hoisted(() => ({
  setStartupWizardSize: vi.fn(async () => ({ success: true, data: true })),
  getEditor: vi.fn(async () => ({ success: true, data: null })),
  setEditor: vi.fn(async () => ({ success: true, data: null })),
  getReadiness: vi.fn(async () => ({ success: true, data: null })),
  completeWizard: vi.fn(async () => ({ success: true, data: null })),
  // 모델 미설치로 응답해 A' 단계가 "나중에 받기"를 노출하게 만든다.
  getEmbeddingModelStatus: vi.fn(async () => ({
    success: true,
    data: { installed: false, downloading: false, progressPct: null },
  })),
  onEmbeddingModelDownloadProgress: vi.fn(() => () => undefined),
  createProject: vi.fn(async () => ({
    success: true,
    data: {
      id: "project-1",
      title: "",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  })),
  markOpened: vi.fn(async () => ({ success: true, data: null })),
  createChapter: vi.fn(async () => ({
    success: true,
    data: { id: "chapter-1" },
  })),
  updateChapter: vi.fn(async () => ({
    success: true,
    data: { id: "chapter-1" },
  })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@shared/api", () => ({
  api: {
    settings: {
      getEditor: mocked.getEditor,
      setEditor: mocked.setEditor,
      getEmbeddingModelStatus: mocked.getEmbeddingModelStatus,
      onEmbeddingModelDownloadProgress: mocked.onEmbeddingModelDownloadProgress,
    },
    window: {
      setStartupWizardSize: mocked.setStartupWizardSize,
    },
    startup: {
      getReadiness: mocked.getReadiness,
      completeWizard: mocked.completeWizard,
    },
    project: {
      create: mocked.createProject,
      markOpened: mocked.markOpened,
    },
    chapter: {
      create: mocked.createChapter,
      update: mocked.updateChapter,
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
  const container = (
    root as unknown as { _internalRoot: { containerInfo: HTMLElement } }
  )._internalRoot.containerInfo;
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === text,
  );
  if (!button) throw new Error(`button not found: ${text}`);
  return button;
};

const renderWizard = async (): Promise<{
  root: Root;
  container: HTMLElement;
}> => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    // 실제 앱(main.tsx)과 동일하게 전역 Provider 아래에서 마운트해야 테마 단계의
    // Editor와 레이아웃 단계의 실제 레이아웃이 useDialog에 접근할 수 있다.
    root.render(
      <ToastProvider>
        <DialogProvider>
          <StartupWizard />
        </DialogProvider>
      </ToastProvider>,
    );
  });
  return { root, container };
};

describe("startup wizard resize", () => {
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    class MockWorker {
      postMessage = vi.fn();
      terminate = vi.fn();
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      onmessage = null;
      onerror = null;
    }
    globalThis.Worker = MockWorker as unknown as typeof Worker;

    vi.clearAllMocks();
    mocked.setStartupWizardSize
      .mockReset()
      .mockResolvedValue({ success: true, data: true });
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-temp");
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.removeAttribute("data-contrast");

    const { resetPreviewWorkspaceState } =
      await import("../../src/renderer/src/features/startup/components/preview/LayoutLivePreview.js");
    resetPreviewWorkspaceState();

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

  it("시작하기는 창을 확장하지 않고, 모델 단계 건너뛰기 때 가로형으로 확장하며 테마를 반영한다", async () => {
    const { root, container } = await renderWizard();
    expect(
      container.querySelector("main")?.classList.contains("animate-in"),
    ).toBe(false);

    await act(async () => {
      findButton(root, "startupWizard.onboarding.startCta").click();
    });
    // A' 모델 단계에서는 창 크기를 유지한다.
    expect(mocked.setStartupWizardSize).not.toHaveBeenCalled();
    const modelClasses = container.querySelector("main")?.classList;
    expect(modelClasses?.contains("fade-in")).toBe(true);
    expect(modelClasses?.contains("duration-200")).toBe(true);
    expect(modelClasses?.contains("slide-in-from-bottom-2")).toBe(false);

    await act(async () => {
      findButton(root, "startupWizard.onboarding.modelLater").click();
    });

    expect(mocked.setStartupWizardSize).toHaveBeenCalledWith(1300, 800, true);
    expect(container.textContent).toContain(
      "startupWizard.onboarding.themeTitle",
    );
    expect(mocked.getEditor).toHaveBeenCalled();
    expect(document.documentElement.getAttribute("data-theme")).toBe("sepia");
    expect(document.documentElement.getAttribute("data-temp")).toBe("warm");
    expect(document.documentElement.getAttribute("data-accent")).toBe("rose");

    const unmount = () => root.unmount();
    act(() => {
      unmount();
    });
  });

  it("resize 응답 전에는 배경만 표시하고, 완료 후에만 다음 단계로 이동한다", async () => {
    const { root, container } = await renderWizard();
    try {
      await act(async () =>
        findButton(root, "startupWizard.onboarding.startCta").click(),
      );
      const expansion = Promise.withResolvers<{
        success: boolean;
        data: boolean;
      }>();
      mocked.setStartupWizardSize.mockImplementationOnce(() => {
        expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
        expect(container.querySelector("button")).toBeNull();
        return expansion.promise;
      });
      await act(async () => {
        const next = findButton(root, "startupWizard.onboarding.modelLater");
        next.click();
        next.click();
      });
      expect(mocked.setStartupWizardSize).toHaveBeenCalledTimes(1);
      expect(container.querySelector(".bg-wizard-bootstrap")).not.toBeNull();
      expect(container.querySelector(".ProseMirror")).toBeNull();
      expect(container.textContent).not.toContain(
        "startupWizard.onboarding.themeTitle",
      );
      await act(async () => expansion.resolve({ success: true, data: true }));
      expect(container.querySelector('[aria-busy="true"]')).toBeNull();
      expect(container.textContent).toContain(
        "startupWizard.onboarding.themeTitle",
      );

      const contraction = Promise.withResolvers<{
        success: boolean;
        data: boolean;
      }>();
      mocked.setStartupWizardSize.mockReturnValueOnce(contraction.promise);
      await act(async () =>
        findButton(root, "startupWizard.onboarding.previous").click(),
      );
      expect(
        container.querySelector('[aria-busy="true"].bg-app'),
      ).not.toBeNull();
      expect(container.querySelector(".ProseMirror")).toBeNull();
      expect(document.documentElement.getAttribute("data-theme")).toBe("sepia");
      await act(async () => contraction.resolve({ success: true, data: true }));
      expect(container.querySelector('[aria-busy="true"]')).toBeNull();
      expect(
        findButton(root, "startupWizard.onboarding.modelLater"),
      ).toBeDefined();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it.each(["false", "error", "reject"])(
    "resize %s 실패 후 재시도는 완료가 아니라 같은 전환을 재시도한다",
    async (failure) => {
      const { root, container } = await renderWizard();
      try {
        await act(async () =>
          findButton(root, "startupWizard.onboarding.startCta").click(),
        );
        if (failure === "reject")
          mocked.setStartupWizardSize.mockRejectedValueOnce(
            new Error("resize rejected"),
          );
        else if (failure === "error")
          mocked.setStartupWizardSize.mockResolvedValueOnce({
            success: false,
            data: false,
          });
        else
          mocked.setStartupWizardSize.mockResolvedValueOnce({
            success: true,
            data: false,
          });
        await act(async () =>
          findButton(root, "startupWizard.onboarding.modelLater").click(),
        );
        expect(container.querySelector('[aria-busy="true"]')).toBeNull();
        await act(async () =>
          findButton(root, "startupWizard.actions.retry").click(),
        );
        expect(mocked.setStartupWizardSize).toHaveBeenLastCalledWith(
          1300,
          800,
          true,
        );
        expect(mocked.setStartupWizardSize).toHaveBeenCalledTimes(2);
        expect(container.textContent).toContain(
          "startupWizard.onboarding.themeTitle",
        );
        expect(mocked.completeWizard).not.toHaveBeenCalled();
      } finally {
        act(() => root.unmount());
        container.remove();
      }
    },
  );

  it("resize 대기 중 unmount 후 늦은 완료는 화면이나 startup을 변경하지 않는다", async () => {
    const { root, container } = await renderWizard();
    await act(async () =>
      findButton(root, "startupWizard.onboarding.startCta").click(),
    );
    const pending = Promise.withResolvers<{
      success: boolean;
      data: boolean;
    }>();
    mocked.setStartupWizardSize.mockReturnValueOnce(pending.promise);
    await act(async () =>
      findButton(root, "startupWizard.onboarding.modelLater").click(),
    );
    act(() => root.unmount());
    await act(async () => pending.resolve({ success: true, data: true }));
    expect(container.childElementCount).toBe(0);
    expect(mocked.completeWizard).not.toHaveBeenCalled();
    container.remove();
  });
});
