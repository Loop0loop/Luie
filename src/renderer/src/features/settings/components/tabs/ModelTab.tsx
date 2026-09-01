import { memo, useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Cpu,
  Database,
  HardDrive,
  Loader2,
} from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import {
  ApiKeysCard,
  LlmfitCard,
  LocalLlmCard,
  ModelLibraryCard,
  OllamaEndpointCard,
  type ModelTabProps,
  type SemanticSearchState,
} from "./modelTabSections";
import {
  buildMemoryBuildProgressView,
  getMemoryBuildJobTypeLabel,
  getMemoryBuildStatusLabel,
} from "./modelTabSections/memoryBuildProgress";
import { getInstalledModelName } from "./modelTabSections/format";

export type { SemanticSearchState };

type AssistantMode = "cloud" | "local";
type CloudProvider = "gemini" | "openai";

export const ModelTab = memo(function ModelTab({
  t,
  isBusy,
  onRebuildMemory,
  onPauseMemoryBuildJobs,
  onResumeMemoryBuildJobs,
  onCancelMemoryBuildJobs,
  memoryBuildProgress,
  localLlmEnabled,
  localLlmModelPath,
  localLlmBinaryPath,
  openaiApiKey,
  geminiApiKey,
  ollamaConfig,
  preferredProvider,
  onSaveLlmKeys,
  onSaveOllamaConfig,
  onSetLlmPreference,
  isDownloading,
  downloadProgress,
  onDownloadLocalModel,
  onSearchHfModels,
  onGetHfModelFiles,
  onToggleLocalLlm,
  llmfitResult,
  llmfitLoading,
  embeddingStatus,
  embeddingProgress,
  embeddingDownloading,
  onDownloadEmbeddingModel,
  semanticSearchState,
}: ModelTabProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLocalConfirmModal, setShowLocalConfirmModal] = useState(false);
  const [showMemoryDetails, setShowMemoryDetails] = useState(false);

  // 현재 모드 계산 (클라우드 vs 로컬)
  const currentMode: AssistantMode = useMemo(() => {
    if (preferredProvider === "sidecar" || localLlmEnabled) return "local";
    return "cloud";
  }, [preferredProvider, localLlmEnabled]);

  // 클라우드 프로바이더 (Gemini vs OpenAI)
  const activeCloudProvider: CloudProvider = useMemo(() => {
    if (preferredProvider === "openai") return "openai";
    return "gemini";
  }, [preferredProvider]);

  const offlineReady = Boolean(localLlmModelPath && localLlmBinaryPath);

  // 클라우드 프로바이더 변경 핸들러
  const handleSelectCloudProvider = useCallback(
    (provider: CloudProvider) => {
      void onSetLlmPreference(provider);
      if (localLlmEnabled) {
        void onToggleLocalLlm(false);
      }
    },
    [onSetLlmPreference, onToggleLocalLlm, localLlmEnabled],
  );

  // 모드 변경 요청 (로컬 클릭 시 확인 모달 표시)
  const handleRequestModeChange = useCallback(
    (mode: AssistantMode) => {
      if (mode === "local") {
        if (currentMode === "local") return;
        setShowLocalConfirmModal(true);
      } else {
        void onSetLlmPreference(activeCloudProvider);
        if (localLlmEnabled) {
          void onToggleLocalLlm(false);
        }
      }
    },
    [currentMode, onSetLlmPreference, activeCloudProvider, localLlmEnabled, onToggleLocalLlm],
  );

  // 로컬 전환 최종 확정
  const handleConfirmLocalMode = useCallback(() => {
    setShowLocalConfirmModal(false);
    void onSetLlmPreference("sidecar");
    if (!localLlmEnabled) {
      void onToggleLocalLlm(true);
    }
  }, [onSetLlmPreference, onToggleLocalLlm, localLlmEnabled]);

  // 메모리 진행 상태 뷰 모델
  const memProgress = useMemo(
    () => buildMemoryBuildProgressView(memoryBuildProgress),
    [memoryBuildProgress],
  );

  const memStatusItems = useMemo(
    () =>
      [
        ["pending", memProgress.pendingCount],
        ["running", memProgress.runningCount],
        ["paused", memProgress.pausedCount],
        ["failed", memProgress.failedCount],
      ].filter(([, count]) => Number(count) > 0),
    [memProgress],
  );

  const pausableCount = memProgress.pendingCount + memProgress.failedCount;
  const cancelableCount =
    memProgress.pendingCount +
    memProgress.failedCount +
    memProgress.pausedCount +
    memProgress.runningCount;

  return (
    <div className="max-w-2xl space-y-6 pb-16">
      {/* ---- Section 1: AI 어시스턴트 실행 방식 ---- */}
      <section className="space-y-3.5">
        <div>
          <h3 className="text-base font-semibold text-fg">
            {t("settings.localLlm.assistant.title", "AI 어시스턴트")}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {t("settings.localLlm.assistant.intro", "문맥 이해 및 집필 보조에 사용할 AI 엔진을 선택합니다.")}
          </p>
        </div>

        {/* 1차 모드 선택: 클라우드 vs 내 PC에서 실행 */}
        <div className="grid grid-cols-2 gap-3">
          {/* Cloud Card */}
          <button
            type="button"
            onClick={() => handleRequestModeChange("cloud")}
            className={`flex flex-col items-start p-4 rounded-panel border text-left transition-all shadow-xs ${
              currentMode === "cloud"
                ? "border-accent bg-surface/80 ring-1 ring-accent shadow-control"
                : "border-border/70 bg-surface/50 backdrop-blur-md hover:border-border hover:bg-surface/70"
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-control border ${
                  currentMode === "cloud"
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : "border-border/60 bg-element/70 text-muted"
                }`}
              >
                <Cloud className="h-4 w-4" />
              </div>
              <span className="rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
                {t("settings.localLlm.assistant.cloud.recommended", "추천")}
              </span>
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-semibold text-fg">
                {t("settings.localLlm.assistant.cloud.title", "클라우드 AI")}
              </h4>
              <p className="text-xs text-muted mt-0.5">
                {t("settings.localLlm.assistant.cloud.desc", "별도 설치나 사양 부담 없이 고성능 AI 모델을 사용합니다.")}
              </p>
            </div>
          </button>

          {/* Local PC Card */}
          <button
            type="button"
            onClick={() => handleRequestModeChange("local")}
            className={`flex flex-col items-start p-4 rounded-panel border text-left transition-all shadow-xs ${
              currentMode === "local"
                ? "border-accent bg-surface/80 ring-1 ring-accent shadow-control"
                : "border-border/70 bg-surface/50 backdrop-blur-md hover:border-border hover:bg-surface/70"
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-control border ${
                  currentMode === "local"
                    ? "border-accent/40 bg-accent/15 text-accent"
                    : "border-border/60 bg-element/70 text-muted"
                }`}
              >
                <HardDrive className="h-4 w-4" />
              </div>
              {offlineReady ? (
                <span className="flex items-center gap-1 rounded-full bg-success/15 border border-success/30 px-2 py-0.5 text-[10px] font-medium text-success">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {t("settings.localLlm.assistant.installedBadge", "설치됨")}
                </span>
              ) : null}
            </div>
            <div className="mt-3">
              <h4 className="text-sm font-semibold text-fg">
                {t("settings.localLlm.assistant.offline.title", "내 PC에서 실행")}
              </h4>
              <p className="text-xs text-muted mt-0.5">
                {t("settings.localLlm.assistant.offline.desc", "오프라인 환경에서도 내 기기의 로컬 모델을 구동합니다.")}
              </p>
            </div>
          </button>
        </div>

        {/* 클라우드 선택 시: Gemini vs GPT 프로바이더 선택기 */}
        {currentMode === "cloud" ? (
          <div className="rounded-panel border border-border/70 bg-surface/60 backdrop-blur-md p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-fg tracking-tight">
                {t("settings.localLlm.assistant.cloudEngineTitle", "클라우드 AI 엔진 선택")}
              </span>
              <span className="text-[11px] text-muted font-medium">
                {t("settings.localLlm.assistant.noKeyNeeded", "별도 API 키 없이 즉시 사용 가능")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Gemini Button */}
              <button
                type="button"
                onClick={() => handleSelectCloudProvider("gemini")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-control border text-xs font-medium transition-all ${
                  activeCloudProvider === "gemini"
                    ? "border-accent bg-accent/10 text-accent font-semibold shadow-xs ring-1 ring-accent"
                    : "border-border/60 bg-element/60 text-muted hover:text-fg hover:bg-surface"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span>Google Gemini 2.5</span>
                </div>
                {activeCloudProvider === "gemini" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                ) : null}
              </button>

              {/* GPT Button */}
              <button
                type="button"
                onClick={() => handleSelectCloudProvider("openai")}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-control border text-xs font-medium transition-all ${
                  activeCloudProvider === "openai"
                    ? "border-accent bg-accent/10 text-accent font-semibold shadow-xs ring-1 ring-accent"
                    : "border-border/60 bg-element/60 text-muted hover:text-fg hover:bg-surface"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <span>OpenAI GPT-4o</span>
                </div>
                {activeCloudProvider === "openai" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                ) : null}
              </button>
            </div>
          </div>
        ) : (
          /* 로컬 모드일 때의 간략 상태 */
          <div className="rounded-panel border border-border/70 bg-surface/60 backdrop-blur-md p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-fg">
                {t("settings.localLlm.assistant.localStatusTitle", "로컬 모델 설정 상태")}
              </span>
              <span className="text-[11px] text-accent font-mono">
                {localLlmModelPath ? getInstalledModelName(localLlmModelPath) : t("settings.localLlm.noModel", "모델 미설정")}
              </span>
            </div>
            <p className="text-xs text-muted">
              {t(
                "settings.localLlm.assistant.localStatusDesc",
                "내 컴퓨터의 CPU/GPU를 활용해 온디바이스로 추론합니다. 모델 파일 및 실행 파일은 고급 설정에서 세부 변경할 수 있습니다.",
              )}
            </p>
          </div>
        )}
      </section>

      {/* ---- Section 2: 임베딩 & 검색 인덱싱 ---- */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-fg">
            {t("settings.localLlm.embedding.title", "텍스트 임베딩 (문맥 검색)")}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {t("settings.localLlm.embedding.description", "원고 및 세계관 항목 간의 연관 관계를 분석하기 위한 경량 검색 모델입니다.")}
          </p>
        </div>

        <div className="rounded-panel border border-border/70 bg-surface/60 backdrop-blur-md p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-control bg-element/80 border border-border/40 text-fg">
                <Cpu className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-fg">
                  {embeddingStatus?.installed ? embeddingStatus.displayName : t("settings.localLlm.embedding.defaultName", "임베딩 모델")}
                </div>
                <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      semanticSearchState === "ready"
                        ? "bg-success"
                        : semanticSearchState === "preparing"
                          ? "bg-warning animate-pulse"
                          : "bg-border"
                    }`}
                  />
                  <span>{t(`settings.localLlm.embedding.semantic.${semanticSearchState}`)}</span>
                </div>
              </div>
            </div>

            {embeddingStatus?.installed ? (
              <span className="flex items-center gap-1 rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-xs font-medium text-success">
                <CheckCircle2 className="h-3 w-3" />
                {t("settings.localLlm.embedding.ready", "준비 완료")}
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onDownloadEmbeddingModel()}
                disabled={embeddingDownloading || isBusy}
                className="rounded-control text-xs"
              >
                {embeddingDownloading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                    {t("settings.localLlm.embedding.downloading", "다운로드 중...")}
                  </>
                ) : (
                  t("settings.localLlm.embedding.download", "임베딩 모델 다운로드")
                )}
              </Button>
            )}
          </div>

          {/* 다운로드 진행률 바 */}
          {embeddingDownloading && embeddingProgress?.stage === "downloading" ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>{t("settings.localLlm.embedding.downloadingProgress", "다운로드 진행 중")}</span>
                <span className="font-mono">{embeddingProgress.pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-element">
                <div
                  className="h-full bg-accent transition-all duration-200"
                  style={{ width: `${embeddingProgress.pct}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ---- Section 3: 메모리 재구성 ---- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-fg">
              {t("settings.localLlm.rebuildMemory.title", "세계관 메모리 색인")}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {t("settings.localLlm.rebuildMemory.description", "작성된 원고로부터 인물, 사건, 관계 메모리를 자동으로 추출하고 갱신합니다.")}
            </p>
          </div>
        </div>

        <div className="rounded-panel border border-border/70 bg-surface/60 backdrop-blur-md p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-control bg-element/80 border border-border/40 text-fg">
                <Database className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-fg">
                  {memProgress.activeCount > 0
                    ? t("settings.localLlm.rebuildMemory.active", "색인 작업 진행 중")
                    : t("settings.localLlm.rebuildMemory.idle", "메모리 색인 대기")}
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  {t("settings.localLlm.rebuildMemory.summaryCounts", {
                    done: memProgress.doneCount,
                    total: memProgress.total,
                    percent: memProgress.percent,
                    defaultValue: `완료 ${memProgress.doneCount}개 / 총 ${memProgress.total}개 (${memProgress.percent}%)`,
                  })}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void onRebuildMemory()}
              disabled={isBusy}
              className="rounded-control text-xs"
            >
              {memProgress.activeCount > 0
                ? t("settings.localLlm.rebuildMemory.restart", "색인 다시 시작")
                : t("settings.localLlm.rebuildMemory.start", "메모리 전체 재구성")}
            </Button>
          </div>

          {/* 진행률 바 */}
          {memProgress.total > 0 ? (
            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-element">
                <div
                  className="h-full bg-accent transition-all duration-200"
                  style={{ width: `${memProgress.percent}%` }}
                />
              </div>

              {/* 제어 버튼 그룹 */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void onPauseMemoryBuildJobs()}
                    disabled={isBusy || pausableCount === 0}
                    className="h-7 px-2.5 text-xs text-muted hover:text-fg"
                  >
                    {t("settings.localLlm.rebuildMemory.pause", "일시정지")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void onResumeMemoryBuildJobs()}
                    disabled={isBusy || memProgress.pausedCount === 0}
                    className="h-7 px-2.5 text-xs text-muted hover:text-fg"
                  >
                    {t("settings.localLlm.rebuildMemory.resume", "재개")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void onCancelMemoryBuildJobs()}
                    disabled={isBusy || cancelableCount === 0}
                    className="h-7 px-2.5 text-xs text-danger hover:text-danger hover:bg-danger/10"
                  >
                    {t("settings.localLlm.rebuildMemory.cancel", "취소")}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMemoryDetails((v) => !v)}
                  className="flex items-center gap-1 text-[11px] text-subtle hover:text-fg transition-colors"
                >
                  <span>
                    {showMemoryDetails
                      ? t("settings.localLlm.rebuildMemory.details.hide", "상세 접기")
                      : t("settings.localLlm.rebuildMemory.details.show", "세부 상태")}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${showMemoryDetails ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {/* 세부 상태 접힘 영역 */}
              {showMemoryDetails ? (
                <div className="rounded-control border border-border/40 bg-element/50 p-2.5 space-y-2 text-xs">
                  {memStatusItems.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {memStatusItems.map(([status, count]) => (
                        <span
                          key={status}
                          className="rounded-control border border-border/60 bg-surface px-1.5 py-0.5 text-[11px] text-muted font-mono"
                        >
                          {t(`settings.localLlm.rebuildMemory.status.${status}`, {
                            defaultValue: getMemoryBuildStatusLabel(String(status)),
                          })}: {count}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {memProgress.jobTypeItems.length > 0 ? (
                    <div className="space-y-1 pt-1 border-t border-border/40">
                      {memProgress.jobTypeItems.map((item) => (
                        <div
                          key={item.jobType}
                          className="flex items-center justify-between text-[11px] text-muted"
                        >
                          <span>
                            {t(`settings.localLlm.rebuildMemory.jobType.${item.jobType}`, {
                              defaultValue: getMemoryBuildJobTypeLabel(item.jobType),
                            })}
                          </span>
                          <span className="font-mono">
                            {item.doneCount}/{item.total} ({item.percent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* ---- Section 4: 고급 설정 (아코디언) ---- */}
      <section className="space-y-3">
        <div className="rounded-panel border border-border/70 bg-surface/50 backdrop-blur-md overflow-hidden transition-all shadow-xs">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between p-3.5 text-xs font-medium text-muted hover:text-fg hover:bg-surface/60 transition-colors"
          >
            <span>
              {t(
                "settings.localLlm.advanced.summary",
                "고급 설정 (API 키 직접 입력, 로컬 모델 다운로드, Ollama)",
              )}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-subtle transition-transform ${
                showAdvanced ? "rotate-180 text-accent" : ""
              }`}
            />
          </button>

          {showAdvanced ? (
            <div className="space-y-4 p-4 pt-1 border-t border-border/60 bg-surface/70 backdrop-blur-md">
              {/* 로컬 모델 다운로드 및 활성화 */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-fg">
                  {t("settings.localLlm.advanced.localDownloadTitle", "기본 로컬 모델 다운로드")}
                </p>
                <LocalLlmCard
                  t={t}
                  isBusy={isBusy}
                  localLlmEnabled={localLlmEnabled}
                  localLlmModelPath={localLlmModelPath}
                  localLlmBinaryPath={localLlmBinaryPath}
                  isDownloading={isDownloading}
                  downloadProgress={downloadProgress}
                  onDownloadLocalModel={onDownloadLocalModel}
                  onToggleLocalLlm={onToggleLocalLlm}
                />
              </div>

              {/* API 키 직접 관리 */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-fg">
                  {t("settings.localLlm.advanced.customKeysTitle", "커스텀 API 키")}
                </p>
                <p className="text-[11px] text-muted">
                  {t(
                    "settings.localLlm.advanced.customKeysDesc",
                    "개인 소유의 OpenAI / Gemini API 키를 직접 사용할 수 있습니다.",
                  )}
                </p>
                <ApiKeysCard
                  key={`${openaiApiKey} ${geminiApiKey}`}
                  t={t}
                  isBusy={isBusy}
                  openaiApiKey={openaiApiKey}
                  geminiApiKey={geminiApiKey}
                  onSaveLlmKeys={onSaveLlmKeys}
                />
              </div>

              {/* 로컬 모델 라이브러리 & 허깅페이스 */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-fg">
                  {t("settings.localLlm.advanced.modelLibTitle", "로컬 LLM 모델 라이브러리")}
                </p>
                <ModelLibraryCard
                  t={t}
                  isBusy={isBusy}
                  isDownloading={isDownloading}
                  onDownloadLocalModel={onDownloadLocalModel}
                  onSearchHfModels={onSearchHfModels}
                  onGetHfModelFiles={onGetHfModelFiles}
                />
              </div>

              {/* 하드웨어 사양 진단 (LLMFit) */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-fg">
                  {t("settings.localLlm.advanced.specCheckTitle", "기기 사양 및 지원 모델 진단")}
                </p>
                <LlmfitCard t={t} llmfitResult={llmfitResult} llmfitLoading={llmfitLoading} />
              </div>

              {/* Ollama 연동 */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-fg">
                  {t("settings.localLlm.advanced.ollamaTitle", "Ollama 엔드포인트 연동")}
                </p>
                <OllamaEndpointCard
                  t={t}
                  isBusy={isBusy}
                  ollamaConfig={ollamaConfig}
                  onSaveOllamaConfig={onSaveOllamaConfig}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ---- Confirmation Modal: 로컬 PC 실행 확인 ---- */}
      {showLocalConfirmModal ? (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-overlay backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowLocalConfirmModal(false)}
        >
          <div
            className="w-full max-w-md rounded-panel border border-border/80 bg-panel/95 backdrop-blur-xl p-6 shadow-modal space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-warning/15 border border-warning/30 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-fg">
                  {t("settings.localLlm.confirmModal.title", "내 PC에서 직접 실행하시겠습니까?")}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {t(
                    "settings.localLlm.confirmModal.desc",
                    "로컬 온디바이스 AI 모델은 인터넷 연결 없이도 작동하지만, 모델 파일 용량(수 GB)과 컴퓨터의 CPU/GPU 자원 및 배터리를 크게 소모할 수 있습니다.",
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-control bg-element/60 border border-border/40 p-3 text-xs text-muted leading-relaxed">
              💡 {t(
                "settings.localLlm.confirmModal.recommendation",
                "안정적이고 빠른 글쓰기 지원을 원하신다면 기본 제공되는 클라우드 AI를 권장합니다.",
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLocalConfirmModal(false)}
                className="rounded-control px-3.5 py-2 text-xs font-medium text-muted hover:text-fg hover:bg-surface border border-transparent hover:border-border transition-all"
              >
                {t("settings.localLlm.confirmModal.cancel", "취소하고 클라우드 유지")}
              </button>
              <button
                type="button"
                onClick={handleConfirmLocalMode}
                className="rounded-control bg-accent px-4 py-2 text-xs font-semibold text-on-accent shadow-control hover:bg-accent/90 transition-all"
              >
                {t("settings.localLlm.confirmModal.confirm", "네, 로컬로 실행할게요")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});
