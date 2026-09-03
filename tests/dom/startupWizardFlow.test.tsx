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
  setStartupWizardSize: vi.fn(async () => undefined),
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
      onEmbeddingModelDownloadProgress:
        mocked.onEmbeddingModelDownloadProgress,
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
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-temp");
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.removeAttribute("data-contrast");

    const { resetPreviewWorkspaceState } = await import(
      "../../src/renderer/src/features/startup/components/preview/LayoutLivePreview.js"
    );
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

  it("시작하기는 창을 확장하지 않고, 모델 단계 건너뛰기 때 가로형으로 확장하며 테마를 반영한다", async () => {
    const { root, container } = await renderWizard();

    await act(async () => {
      findButton(root, "startupWizard.onboarding.startCta").click();
    });
    // A' 모델 단계에서는 창 크기를 유지한다.
    expect(mocked.setStartupWizardSize).not.toHaveBeenCalled();

    await act(async () => {
      findButton(root, "startupWizard.onboarding.modelLater").click();
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
      findButton(root, "startupWizard.onboarding.modelLater").click();
    });
    await act(async () => {
      findButton(root, "startupWizard.onboarding.themeDark").click();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await act(async () => {
      findButton(root, "startupWizard.onboarding.next").click();
    });
    // 1. Default 레이아웃(초기 상태)에서 연구 패널(등장인물 등) 선택 시 panels에 추가되고 Cmd+W로 닫히는지 검증
    const { useUIStore } = await import(
      "../../src/renderer/src/features/workspace/stores/uiStore.js"
    );
    expect(useUIStore.getState().panels.length).toBe(0);

    // 사이드바의 등장인물 항목 클릭
    const characterItem = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "sidebar.item.characters",
    );
    if (characterItem) {
      await act(async () => {
        characterItem.click();
      });
      expect(useUIStore.getState().panels.length).toBe(1);
      expect(useUIStore.getState().panels[0]?.content.type).toBe("research");

      // Cmd+W 입력 시 열린 패널이 닫히는지 검증
      await act(async () => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "w",
            metaKey: true,
            bubbles: true,
          }),
        );
      });
      expect(useUIStore.getState().panels.length).toBe(0);
    }

    // 2. 스크리브너 레이아웃 선택
    await act(async () => {
      findButton(root, "startupWizard.onboarding.layoutScrivener").click();
    });
    await act(async () => {
      await import(
        "../../src/renderer/src/features/workspace/components/layout/ScrivenerLayout.js"
      );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // 스크리브너 선택 시 인스펙터가 열린 상태에서 Cmd+W 입력 시 인스펙터/패널이 닫히는지 검증
    expect(useUIStore.getState().regions.rightPanel.open).toBe(true);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "w",
          metaKey: true,
          bubbles: true,
        }),
      );
    });
    expect(useUIStore.getState().regions.rightPanel.open).toBe(false);

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
    expect(mocked.createChapter).toHaveBeenCalledWith({
      projectId: "project-1",
      title: "1장",
    });
    expect(mocked.updateChapter).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "chapter-1",
        title: "1장",
      }),
    );
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

  it("ISTQB 조건 1: Wizard 상황일 때 6대 연구 요소 및 3개 챕터 데이터가 안전하게 시딩되고 불필요한 백엔드 조회가 차단된다", async () => {
    const { useCharacterStore } = await import(
      "../../src/renderer/src/features/research/stores/characterStore.js"
    );
    const { useEventStore } = await import(
      "../../src/renderer/src/features/research/stores/eventStore.js"
    );
    const { useFactionStore } = await import(
      "../../src/renderer/src/features/research/stores/factionStore.js"
    );
    const { useTermStore } = await import(
      "../../src/renderer/src/features/research/stores/termStore.js"
    );
    const { useChapterStore } = await import(
      "../../src/renderer/src/features/manuscript/stores/chapterStore.js"
    );
    const { useProjectStore } = await import(
      "../../src/renderer/src/domains/project/index.js"
    );
    const { PREVIEW_PROJECT_ID } = await import(
      "../../src/renderer/src/features/startup/constants/previewData.js"
    );

    const { root } = await renderWizard();

    // 테마 -> 레이아웃 이동하여 프리뷰 마운트
    await act(async () => {
      findButton(root, "startupWizard.onboarding.startCta").click();
    });
    await act(async () => {
      findButton(root, "startupWizard.onboarding.modelLater").click();
    });
    await act(async () => {
      findButton(root, "startupWizard.onboarding.next").click();
    });

    // 1. 위저드 환경에서 3개 챕터 및 6대 연구 엔티티가 정상 시딩되었는지 검증
    expect(useProjectStore.getState().currentItem?.id).toBe(PREVIEW_PROJECT_ID);
    expect(useChapterStore.getState().items.length).toBe(3);
    expect(useCharacterStore.getState().items.length).toBe(2);
    expect(useEventStore.getState().items.length).toBe(2);
    // 2. 프리뷰 엔티티 상세 조회(loadOne) 시 백엔드 조회 없이 인메모리로 바인딩되는지 검증
    await act(async () => {
      await useEventStore.getState().loadOne("wizard-preview-event-1");
      await useFactionStore.getState().loadOne("wizard-preview-faction-1");
    });
    expect(useEventStore.getState().currentItem?.id).toBe("wizard-preview-event-1");
    expect(useFactionStore.getState().currentItem?.id).toBe("wizard-preview-faction-1");

    // 3. 챕터 전환(2장으로 변경) 시 백엔드 조회 없이 인메모리 본문이 정상 세팅되는지 검증
    const { useChapterContentStore } = await import(
      "../../src/renderer/src/features/manuscript/stores/chapterContentStore.js"
    );
    await act(async () => {
      useChapterStore.getState().setCurrent(useChapterStore.getState().items[1] ?? null);
      await useChapterContentStore.getState().ensureContent("wizard-preview-chapter-2");
    });
    expect(useChapterStore.getState().currentItem?.title).toBe("2장. 귀갓길");
    expect(useChapterContentStore.getState().contentByChapterId["wizard-preview-chapter-2"]).toContain("오로라호");

    // 4. 가상 프로젝트 ID로는 markOpened가 호출되지 않았음을 확인
    expect(mocked.markOpened).not.toHaveBeenCalledWith(PREVIEW_PROJECT_ID);

    const unmount = () => root.unmount();
    act(() => {
      unmount();
    });
  });

  it("ISTQB 조건 2: 일반적 상황일 때 실제 프로젝트 로드 시 실제 데이터로 온전히 바인딩되며 위저드 데이터가 격리된다", async () => {
    const { useCharacterStore } = await import(
      "../../src/renderer/src/features/research/stores/characterStore.js"
    );
    const { useProjectStore } = await import(
      "../../src/renderer/src/domains/project/index.js"
    );

    const REAL_PROJECT_ID = "real-user-project-uuid";
    const realProject = {
      id: REAL_PROJECT_ID,
      title: "실제 작성 중인 원고",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };

    // 실제 프로젝트로 스토어 전환 (일반 작업 환경)
    useProjectStore.setState({
      currentItem: realProject,
      currentProject: realProject,
    });

    // 실제 프로젝트 엔티티로 덮어쓰기/로드
    useCharacterStore.setState({
      items: [
        {
          id: "real-char-1",
          projectId: REAL_PROJECT_ID,
          name: "실제 소설 주인공",
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      characters: [
        {
          id: "real-char-1",
          projectId: REAL_PROJECT_ID,
          name: "실제 소설 주인공",
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      currentItem: null,
      currentCharacter: null,
    });

    // 위저드 가상 캐릭터("강세연", "서도진")가 없고 실제 프로젝트 데이터만 남아있는지 확인
    const characters = useCharacterStore.getState().items;
    expect(characters.length).toBe(1);
    expect(characters[0]?.id).toBe("real-char-1");
    expect(characters[0]?.name).toBe("실제 소설 주인공");
    expect(characters.some((c) => c.id === "wizard-preview-character-1")).toBe(false);
  });

  it("연구 패널이 이미 열려 있는 상태에서 스마트링크 클릭 시 중복 Panel ID 없이 탭이 전환된다", async () => {
    const { useUIStore } = await import(
      "../../src/renderer/src/features/workspace/stores/uiStore.js"
    );
    const { smartLinkService } = await import(
      "../../src/renderer/src/features/editor/services/smartLinkService.js"
    );

    // 1. 사건(event) 패널 오픈
    useUIStore.getState().addPanel({ type: "research", tab: "event" });
    expect(useUIStore.getState().panels.length).toBe(1);
    expect(useUIStore.getState().panels[0]?.id).toBe("research");
    expect(useUIStore.getState().panels[0]?.content.tab).toBe("event");

    // 2. 스마트링크를 통해 인물(character) 클릭 시뮬레이션
    smartLinkService.openItem("wizard-preview-character-1", "character");

    // 3. 중복 패널이 추가되지 않고 기존 research 패널이 character 탭으로 전환되었는지 검증
    const panels = useUIStore.getState().panels;
    expect(panels.length).toBe(1);
    expect(panels[0]?.id).toBe("research");
    expect(panels[0]?.content.tab).toBe("character");
  });
});
