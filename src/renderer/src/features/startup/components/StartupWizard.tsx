import { dragRegionStyle } from "../constants/previewData";
import { useStartupWizardState } from "../hooks/useStartupWizardState";
import { useWizardThemeEffect } from "../hooks/useWizardThemeEffect";
import { EmbeddingModelStatusBar } from "./EmbeddingModelStatusBar";
import { IntroStep } from "./steps/IntroStep";
import { LayoutStep } from "./steps/LayoutStep";
import { ModelStep } from "./steps/ModelStep";
import { PrepareStep } from "./steps/PrepareStep";
import { StatusStep } from "./steps/StatusStep";
import { ThemeStep } from "./steps/ThemeStep";

export default function StartupWizard() {
  const {
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
    persistEditorSettings,
    finalize,
    handleFinish,
    handleCreateAndStart,
    handleRetry,
  } = useStartupWizardState();

  useWizardThemeEffect(step, theme, themeTemp, editorSettings);

  // NOTE: h-screen 고정(overflow-hidden)이어야 본문(main)이 뷰포트 안에 갇힌다.
  // min-h-screen이면 콘텐츠가 세로로 밀릴 때 루트 자체가 창 밖으로 자라 하단 버튼이
  // 클립되어 누를 수 없게 된다.
  const isBootstrapStage = step === "intro" || step === "model";
  return (
    <div
      className={`flex h-screen w-screen flex-col overflow-hidden text-fg ${
        isBootstrapStage ? "bg-wizard-bootstrap" : "bg-app"
      }`}
    >
      {/* 테마·레이아웃 단계는 실제 프리뷰가 창 전체(h-screen)를 차지하므로 위저드
          고유의 헤더/본문 대신 각 스텝의 풀블리드 오버레이가 렌더링된다. */}
      {step !== "theme" && step !== "layout" && (
        <header
          className="h-12 shrink-0 select-none pl-20"
          style={dragRegionStyle}
        />
      )}

      {/* 단계 전환은 저장소 모션 규범(animate-in)을 따른다. 비활성화 스위치는
          data-animations → global.behaviors.css가 닫아 준다. workArea clamp 등으로
          내용이 세로로 밀리면 본문이 스스로 스크롤한다. */}
      {step !== "theme" && step !== "layout" && (
        <main
          key={step}
          className="animate-in fade-in slide-in-from-bottom-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-10 pb-8 duration-300"
        >
          {step === "intro" && (
            <IntroStep
              onStart={handleStart}
              onSkip={() => void finalize()}
            />
          )}

          {step === "model" && (
            <ModelStep onContinue={handleModelContinue} />
          )}

          {step === "prepare" && (
            <PrepareStep
              projectTitle={projectTitle}
              onProjectTitleChange={setProjectTitle}
              isCreatingProject={isCreatingProject}
              projectError={projectError}
              onCreateAndStart={() => void handleCreateAndStart()}
              onSkip={() => void finalize()}
            />
          )}

          {(step === "finalizing" || step === "error") && (
            <StatusStep
              step={step}
              phase={finalizingPhase}
              errorMessage={errorMessage}
              onRetry={handleRetry}
            />
          )}
        </main>
      )}

      {step === "theme" && (
        <ThemeStep
          theme={theme}
          onThemeChange={setTheme}
          themeTemp={themeTemp}
          onThemeTempChange={setThemeTemp}
          onPrevious={() => setStep("model")}
          onNext={() => {
            void persistEditorSettings();
            setStep("layout");
          }}
        />
      )}

      {step === "layout" && (
        <LayoutStep
          uiMode={uiMode}
          onUiModeChange={setUiMode}
          onPrevious={() => setStep("theme")}
          onFinish={handleFinish}
        />
      )}

      {/* 임베딩 모델 다운로드는 위저드 진행과 병렬적으로 계속된다. 남은 단계와
          메인 창에서도 진행 상황을 보여 주고, 완료 시 재시작 안내로 바뀐다. */}
      <EmbeddingModelStatusBar />
    </div>
  );
}
