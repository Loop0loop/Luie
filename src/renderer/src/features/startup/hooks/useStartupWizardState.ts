import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@shared/api";
import type { EditorSettings } from "@shared/types";
import type {
  FinalizingPhase,
  LayoutChoice,
  TempChoice,
  ThemeChoice,
  WizardStep,
} from "../types/wizard";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export function useStartupWizardState() {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [step, setStep] = useState<WizardStep>("intro");
  const [finalizingPhase, setFinalizingPhase] =
    useState<FinalizingPhase>("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [editorSettings, setEditorSettings] = useState<EditorSettings | null>(
    null,
  );
  const [theme, setTheme] = useState<ThemeChoice>("light");
  const [themeTemp, setThemeTemp] = useState<TempChoice>("neutral");
  const [uiMode, setUiMode] = useState<LayoutChoice>("default");
  const [projectTitle, setProjectTitle] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const response = await api.settings.getEditor();
      if (active && response.success && response.data) {
        setEditorSettings(response.data);
        setTheme(response.data.theme);
        setThemeTemp(response.data.themeTemp);
        setUiMode(response.data.uiMode);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const animationsEnabled = editorSettings?.enableAnimations ?? true;

  const handleStart = useCallback(() => {
    // 모델 준비(A') 단계에서는 창 크기를 유지한다. 1300×800 가로형 확장은
    // 테마(B) 진입 시점에 그대로 발생한다(handleModelContinue).
    setStep("model");
  }, []);

  const handleModelContinue = useCallback(() => {
    // B 단계부터는 1300×800 가로형으로 확장한다. 작은 디스플레이는 main handler가
    // workArea에 맞춰 clamp한다. 확장 애니메이션은 main handler에서 600ms
    // easeOutCubic으로 보간하며, 애니메이션 여부는 enableAnimations 판정을 그대로 넘긴다.
    void api.window.setStartupWizardSize(1300, 800, animationsEnabled);
    setStep("theme");
  }, [animationsEnabled]);

  const handleThemePrevious = useCallback(() => {
    // 모델 준비(A') 단계로 돌아갈 때는 초기 콤팩트 크기로 창을 복원한다.
    void api.window.setStartupWizardSize(-1, -1, animationsEnabled);
    setStep("model");
  }, [animationsEnabled]);

  const persistEditorSettings = useCallback(async () => {
    if (!editorSettings) return;
    await api.settings.setEditor({
      ...editorSettings,
      theme,
      themeTemp,
      uiMode,
    });
  }, [editorSettings, theme, themeTemp, uiMode]);

  // readiness가 위저드 완료를 요구할 때만 completeWizard를 호출한다. completeWizard는
  // main이 위저드 창을 닫고 메인 창 플로우를 여는 신호이므로 반드시 마지막에 호출한다.
  const completeStartup = useCallback(async () => {
    const readinessResponse = await api.startup.getReadiness();
    if (!readinessResponse.success || !readinessResponse.data) {
      throw new Error(
        readinessResponse.error?.message ??
          "Failed to evaluate startup readiness",
      );
    }
    if (!readinessResponse.data.mustRunWizard) return;
    const completeResponse = await api.startup.completeWizard();
    if (!completeResponse.success || !completeResponse.data) {
      throw new Error(
        completeResponse.error?.message ??
          "Failed to complete startup configuration",
      );
    }
    if (completeResponse.data.mustRunWizard) {
      const unresolved = completeResponse.data.reasons.join(", ");
      throw new Error(`STARTUP_PENDING_CHECKS:${unresolved || "unknown"}`);
    }
  }, []);

  /** "설정 나중에 하기" 경로 — 프로젝트 준비를 건너뛰고 바로 앱으로 넘어간다. */
  const finalize = useCallback(async () => {
    setFinalizingPhase("finishing");
    setStep("finalizing");
    setErrorMessage(null);
    try {
      await persistEditorSettings();
      await completeStartup();
    } catch (error) {
      setStep("error");
      setErrorMessage(getErrorMessage(error));
    }
  }, [completeStartup, persistEditorSettings]);

  /** "Luie 시작하기" 경로:
   * 1. 초기화 중 로딩 표시
   * 2. 완료 알림
   * 3. 최대 창 크기(workArea px 최대)로 확장
   * 4. 프로젝트 생성/선택 창으로 전환
   */
  const handleFinish = useCallback(() => {
    setFinalizingPhase("initializing");
    setStep("finalizing");
    setErrorMessage(null);
    void (async () => {
      try {
        await persistEditorSettings();
        if (!isMountedRef.current) return;
        setFinalizingPhase("completed");
        // 완료 피드백을 인지할 수 있도록 대기
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (!isMountedRef.current) return;

        // workArea 기반 화면 최대 크기로 창 확장 (main 핸들러가 workArea-40으로 clamp)
        void api.window.setStartupWizardSize(4096, 4096, animationsEnabled);
        // 확장 애니메이션(600ms) 대기
        await new Promise((resolve) => setTimeout(resolve, 650));
        if (!isMountedRef.current) return;
        setStep("prepare");
      } catch (error) {
        if (!isMountedRef.current) return;
        setStep("error");
        setErrorMessage(getErrorMessage(error));
      }
    })();
  }, [animationsEnabled, persistEditorSettings]);

  const handleCreateAndStart = useCallback(async () => {
    const title = projectTitle.trim();
    if (!title || isCreatingProject) return;
    setIsCreatingProject(true);
    setProjectError(null);
    try {
      // 1. 새 프로젝트 생성 (기본 Documents 폴더에 .luie 패키지 할당)
      const createdResponse = await api.project.create({ title });
      if (!createdResponse.success || !createdResponse.data) {
        throw new Error(
          createdResponse.error?.message ?? "Failed to create project",
        );
      }
      const projectId = createdResponse.data.id;

      // 2-1. 기본 챕터 1개 추가
      const chapterResponse = await api.chapter.create({
        projectId,
        title: "1장",
      });

      // 2-2. 기본 본문 1개 추가
      if (chapterResponse.success && chapterResponse.data?.id) {
        await api.chapter.update({
          id: chapterResponse.data.id,
          title: "1장",
          content: "<p>첫 문장을 적어보세요.</p>",
        });
      }

      await api.project.markOpened(projectId);

      // 위저드를 통해 시작할 때만 템플릿 화면을 건너뛰고 에디터로 직행하도록 플래그 기록
      try {
        localStorage.setItem("luie:wizard-auto-open-project", projectId);
      } catch {
        // storage disabled fallback
      }

      setFinalizingPhase("finishing");
      setStep("finalizing");
      await completeStartup();
    } catch (error) {
      setProjectError(getErrorMessage(error));
      setIsCreatingProject(false);
    }
  }, [completeStartup, isCreatingProject, projectTitle]);

  const handleRetry = useCallback(() => {
    setAttempt((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (attempt === 0) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void finalize();
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, finalize]);

  return {
    step,
    setStep,
    finalizingPhase,
    errorMessage,
    editorSettings,
    theme,
    setTheme,
    themeTemp,
    setThemeTemp,
    uiMode,
    setUiMode,
    projectTitle,
    setProjectTitle,
    isCreatingProject,
    projectError,
    handleStart,
    handleModelContinue,
    handleThemePrevious,
    persistEditorSettings,
    finalize,
    handleFinish,
    handleCreateAndStart,
    handleRetry,
  };
}
