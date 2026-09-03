// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: A'(모델) 단계의 독자 동작을 검증한다. 시작하기는 창 크기를 유지한 채
// 모델 단계로 진입하고, 다운로드 시작 시 진행률 UI·하단 바가 뜨며, 설치 완료 시
// 하단 바가 재시작 안내로 바뀐다. 진행률 이벤트는 main이 모든 창에 브로드캐스트하는
// EMBEDDING_MODEL_DOWNLOAD_PROGRESS 페이로드를 그대로 시뮬레이션한다.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogProvider } from "../../src/shared/ui/DialogProvider.js";
import { ToastProvider } from "../../src/shared/ui/Toast.js";

type ProgressPayload = { stage: string; pct: number; error?: string };

const mocked = vi.hoisted(() => {
  const listeners: Array<(payload: ProgressPayload) => void> = [];
  return {
    listeners,
    setStartupWizardSize: vi.fn(async () => undefined),
    getEditor: vi.fn(async () => ({ success: true, data: null })),
    getEmbeddingModelStatus: vi.fn(async () => ({
      success: true,
      data: { installed: false, downloading: false, progressPct: null },
    })),
    downloadEmbeddingModel: vi.fn(async () => ({
      success: true,
      data: { ok: true },
    })),
    onEmbeddingModelDownloadProgress: vi.fn((callback) => {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index >= 0) listeners.splice(index, 1);
      };
    }),
    relaunch: vi.fn(async () => ({ success: true, data: null })),
  };
});

const emitProgress = (payload: ProgressPayload) => {
  for (const listener of mocked.listeners) listener(payload);
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@shared/api", () => ({
  api: {
    settings: {
      getEditor: mocked.getEditor,
      getEmbeddingModelStatus: mocked.getEmbeddingModelStatus,
      downloadEmbeddingModel: mocked.downloadEmbeddingModel,
      onEmbeddingModelDownloadProgress: mocked.onEmbeddingModelDownloadProgress,
    },
    app: { relaunch: mocked.relaunch },
    window: { setStartupWizardSize: mocked.setStartupWizardSize },
  },
}));

import StartupWizard from "../../src/renderer/src/features/startup/components/StartupWizard.js";
import { useModelInstallStore } from "../../src/renderer/src/features/startup/stores/modelInstallStore.js";

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

describe("startup wizard model step", () => {
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
    // NOTE: listeners는 비우지 않는다. 스토어의 구독은 모듈 레벨에서 1회만
    // 이뤄지므로, 첫 initialize가 등록한 콜백이 파일 전체 테스트에서 유효해야 한다.
    useModelInstallStore.setState({
      phase: "idle",
      pct: 0,
      error: null,
      dismissed: false,
    });
    document.documentElement.removeAttribute("data-theme");

    const { resetPreviewWorkspaceState } = await import(
      "../../src/renderer/src/features/startup/components/preview/LayoutLivePreview.js"
    );
    resetPreviewWorkspaceState();

    mocked.getEditor.mockResolvedValue({
      success: true,
      data: { ...baseEditorSettings },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  });

  it("시작하기는 창 크기를 유지한 채 모델 단계로 진입한다", async () => {
    const { root, container } = await renderWizard();

    await act(async () => {
      findButton(root, "startupWizard.onboarding.startCta").click();
    });

    expect(mocked.setStartupWizardSize).not.toHaveBeenCalled();
    expect(container.textContent).toContain("startupWizard.onboarding.modelTitle");
    expect(container.textContent).toContain("startupWizard.onboarding.modelCta");
    expect(container.textContent).toContain("startupWizard.onboarding.modelLater");
    // 테마 확정 전이므로 고정 dark bootstrap을 유지한다.
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    act(() => {
      root.unmount();
    });
  });

  it("다운로드를 시작하면 진행률 UI와 하단 바가 뜨고, 계속하기로 테마 단계에 진입한다", async () => {
    const { root, container } = await renderWizard();

    await act(async () => {
      findButton(root, "startupWizard.onboarding.startCta").click();
    });
    await act(async () => {
      findButton(root, "startupWizard.onboarding.modelCta").click();
    });

    expect(mocked.downloadEmbeddingModel).toHaveBeenCalled();

    await act(async () => {
      emitProgress({ stage: "downloading", pct: 42 });
    });
    expect(container.textContent).toContain("42%");
    // 위저드 본문 아래 inline 바도 같은 진행률을 보여 준다.
    expect(container.textContent).toContain(
      "startupWizard.onboarding.modelBarDownloading",
    );

    await act(async () => {
      findButton(root, "startupWizard.onboarding.modelContinue").click();
    });

    // 확장은 모델 단계가 아니라 테마 진입 시점에 발생한다.
    expect(mocked.setStartupWizardSize).toHaveBeenCalledWith(1300, 800, true);
    expect(container.textContent).toContain("startupWizard.onboarding.themeTitle");
    expect(document.documentElement.getAttribute("data-theme")).toBe("sepia");
    // 테마 단계(풀블리드)에서도 하단 바의 진행률이 유지된다.
    expect(container.textContent).toContain(
      "startupWizard.onboarding.modelBarDownloading",
    );

    act(() => {
      root.unmount();
    });
  });

  it("설치가 완료되면 하단 바가 재시작 안내로 바뀌고 재시작 버튼으로 앱을 다시 시작한다", async () => {
    const { root, container } = await renderWizard();

    await act(async () => {
      findButton(root, "startupWizard.onboarding.startCta").click();
    });
    await act(async () => {
      findButton(root, "startupWizard.onboarding.modelCta").click();
    });
    await act(async () => {
      emitProgress({ stage: "complete", pct: 100 });
    });

    expect(container.textContent).toContain(
      "startupWizard.onboarding.modelBarCompleteTitle",
    );
    expect(mocked.relaunch).not.toHaveBeenCalled();

    await act(async () => {
      findButton(root, "startupWizard.onboarding.modelBarRestart").click();
    });
    expect(mocked.relaunch).toHaveBeenCalled();

    // "나중에"로 닫으면 안내가 사라진다.
    await act(async () => {
      findButton(root, "startupWizard.onboarding.modelBarLater").click();
    });
    expect(container.textContent).not.toContain(
      "startupWizard.onboarding.modelBarCompleteTitle",
    );

    act(() => {
      root.unmount();
    });
  });

  it("다운로드가 실패하면 하단 바에서 다시 시도할 수 있다", async () => {
    const { root, container } = await renderWizard();

    await act(async () => {
      findButton(root, "startupWizard.onboarding.startCta").click();
    });
    await act(async () => {
      findButton(root, "startupWizard.onboarding.modelCta").click();
    });
    await act(async () => {
      emitProgress({ stage: "error", pct: 0, error: "HTTP 503" });
    });

    expect(container.textContent).toContain("HTTP 503");
    expect(container.textContent).toContain(
      "startupWizard.onboarding.modelBarRetry",
    );

    await act(async () => {
      findButton(root, "startupWizard.onboarding.modelBarRetry").click();
    });
    expect(mocked.downloadEmbeddingModel).toHaveBeenCalledTimes(2);

    act(() => {
      root.unmount();
    });
  });
});
