// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: 시작 위저드가 A(인트로, 고정 dark bootstrap) → B(테마, 창 리사이즈 + 라이브
// theme 속성) → B-3(레이아웃) → 완료 대기(설정 저장 + 전체화면 확장 요청) →
// 프로젝트 준비(프로젝트 생성 + markOpened) → 완료(readiness + completeWizard)로
// 진행한다. completeWizard는 메인 창 플로우를 여는 신호라 반드시 마지막에 호출된다.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogProvider } from "../../src/shared/ui/DialogProvider.js";
import { ToastProvider } from "../../src/shared/ui/Toast.js";

const mocked = vi.hoisted(() => ({
  setStartupWizardSize: vi.fn(async () => undefined),
  getEditor: vi.fn(async () => ({ success: true, data: null })),
  setEditor: vi.fn(async () => ({ success: true, data: null })),
  getReadiness: vi.fn(async () => ({ success: true, data: null })),
  completeWizard: vi.fn(async () => ({ success: true, data: null })),
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
    project: {
      create: mocked.createProject,
      markOpened: mocked.markOpened,
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

  it("인트로(A)는 고정 dark bootstrap 위에 로고·환영 문구·CTA로 뜬다", async () => {
    const { root, container } = await renderWizard();

    expect(container.textContent).toContain(
      "startupWizard.onboarding.welcomeTitle",
    );
    expect(container.textContent).toContain("startupWizard.onboarding.welcomeBody");
    expect(container.textContent).toContain("startupWizard.onboarding.startCta");
    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
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

    expect(mocked.setStartupWizardSize).toHaveBeenCalledWith(1300, 800, true);
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

  it("테마 카드는 라이브로 data-theme을 바꾸고, 완료 시 저장→전체화면 확장→프로젝트 준비→완료로 이어진다", async () => {
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

    // "Luie 시작하기"는 4단계 플로우로 진행된다:
    // 1. 초기화 중 로딩 표시 + 설정 저장
    // 2. 초기화 완료 알림
    // 3. workArea 전체 크기 확장 요청(4096x4096)
    // 4. 확장 후 프로젝트 준비(prepare) 단계로 전환
    expect(mocked.setEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        ...baseEditorSettings,
        theme: "dark",
        uiMode: "scrivener",
      }),
    );

    // 완료 알림 및 창 확장 애니메이션 대기 후 prepare 단계 열림
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1600));
    });
    expect(mocked.setStartupWizardSize).toHaveBeenCalledWith(
      4096,
      4096,
      true,
    );
    expect(container.textContent).toContain(
      "startupWizard.onboarding.prepareTitle",
    );
    expect(mocked.completeWizard).not.toHaveBeenCalled();

    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    const setValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    act(() => {
      setValue?.call(input, "내 첫 소설");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      findButton(root, "startupWizard.onboarding.prepareCreateCta").click();
    });

    expect(mocked.createProject).toHaveBeenCalledWith({ title: "내 첫 소설" });
    expect(mocked.markOpened).toHaveBeenCalledWith("project-1");
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
