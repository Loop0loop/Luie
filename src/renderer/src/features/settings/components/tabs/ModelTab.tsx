import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Feather,
  HardDrive,
  Sparkles,
} from "lucide-react";
import {
  ApiKeysCard,
  EmbeddingCard,
  LlmfitCard,
  LocalLlmCard,
  ModelLibraryCard,
  OllamaEndpointCard,
  RebuildMemoryCard,
  type ModelTabProps,
  type SemanticSearchState,
} from "./modelTabSections";
import { getInstalledModelName } from "./modelTabSections/format";

export type { SemanticSearchState };

type AssistantPath = "cloud" | "offline";

export function ModelTab({
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

  // NOTE: 저장 preference를 우선하되 실제 설정된 provider로 fallback해 잘못된 상태 표시를 피한다.
  const activePath: AssistantPath = (() => {
    if (preferredProvider === "sidecar") return "offline";
    if (preferredProvider === "openai" || preferredProvider === "gemini") return "cloud";
    if (preferredProvider === "ollama") return "cloud";
    if (localLlmEnabled) return "offline";
    return "cloud";
  })();

  const cloudConnected = Boolean(openaiApiKey || geminiApiKey);
  const offlineReady = Boolean(localLlmModelPath && localLlmBinaryPath);
  const anyConnected = cloudConnected || offlineReady;

  const switchPath = (path: AssistantPath) => {
    if (path === activePath) return;
    if (path === "offline") {
      void onSetLlmPreference("sidecar");
    } else {
      void onSetLlmPreference(openaiApiKey ? "openai" : geminiApiKey ? "gemini" : "openai");
    }
  };

  const activeLabel = !anyConnected
    ? t("settings.localLlm.assistant.notConnected")
    : activePath === "offline"
      ? `${t("settings.localLlm.assistant.offline.title")} - ${getInstalledModelName(localLlmModelPath)}`
      : t("settings.localLlm.assistant.connected");

  return (
    <div className="space-y-8 p-1">
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Feather className="h-4 w-4 text-accent" />
            {t("settings.localLlm.assistant.title")}
          </h3>
          <p className="text-xs text-muted">{t("settings.localLlm.assistant.intro")}</p>
        </div>

        <div
          className={`flex items-center gap-2 rounded-control border px-3 py-2 text-xs ${
            anyConnected
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/30 bg-warning/10 text-warning"
          }`}
        >
          {anyConnected ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{activeLabel}</span>
        </div>

        <PathCard
          active={activePath === "cloud"}
          icon={<Cloud className="h-4 w-4" />}
          title={t("settings.localLlm.assistant.cloud.title")}
          desc={t("settings.localLlm.assistant.cloud.desc")}
          recommended={t("settings.localLlm.assistant.cloud.recommended")}
          connectedBadge={cloudConnected ? t("settings.localLlm.assistant.connectedBadge") : null}
          onActivate={() => switchPath("cloud")}
          activateLabel={t("settings.localLlm.assistant.use")}
        >
          <ApiKeysCard
            key={`${openaiApiKey} ${geminiApiKey}`}
            t={t}
            isBusy={isBusy}
            openaiApiKey={openaiApiKey}
            geminiApiKey={geminiApiKey}
            onSaveLlmKeys={onSaveLlmKeys}
          />
        </PathCard>

        <PathCard
          active={activePath === "offline"}
          icon={<HardDrive className="h-4 w-4" />}
          title={t("settings.localLlm.assistant.offline.title")}
          desc={t("settings.localLlm.assistant.offline.desc")}
          connectedBadge={offlineReady ? t("settings.localLlm.assistant.installedBadge") : null}
          onActivate={() => switchPath("offline")}
          activateLabel={t("settings.localLlm.assistant.use")}
        >
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
        </PathCard>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Sparkles className="h-4 w-4 text-accent" />
            {t("settings.localLlm.understand.title")}
          </h3>
          <p className="text-xs text-muted">{t("settings.localLlm.understand.intro")}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
              {t("settings.localLlm.understand.step1Label")}
            </p>
            <EmbeddingCard
              t={t}
              isBusy={isBusy}
              embeddingStatus={embeddingStatus}
              embeddingProgress={embeddingProgress}
              embeddingDownloading={embeddingDownloading}
              onDownloadEmbeddingModel={onDownloadEmbeddingModel}
              semanticSearchState={semanticSearchState}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-subtle">
              {t("settings.localLlm.understand.step2Label")}
            </p>
            <RebuildMemoryCard
              t={t}
              isBusy={isBusy}
              onRebuildMemory={onRebuildMemory}
              onPauseMemoryBuildJobs={onPauseMemoryBuildJobs}
              onResumeMemoryBuildJobs={onResumeMemoryBuildJobs}
              onCancelMemoryBuildJobs={onCancelMemoryBuildJobs}
              memoryBuildProgress={memoryBuildProgress}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-control border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-hover focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={showAdvanced}
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium text-fg-secondary">
              {t("settings.localLlm.advanced.title")}
            </span>
            <span className="block truncate text-[11px] text-muted">
              {t("settings.localLlm.advanced.desc")}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-subtle transition-transform ${
              showAdvanced ? "rotate-180" : ""
            }`}
          />
        </button>

        {showAdvanced && (
          <div className="space-y-3">
            <ModelLibraryCard
              t={t}
              isBusy={isBusy}
              isDownloading={isDownloading}
              onDownloadLocalModel={onDownloadLocalModel}
              onSearchHfModels={onSearchHfModels}
              onGetHfModelFiles={onGetHfModelFiles}
            />
            <LlmfitCard t={t} llmfitResult={llmfitResult} llmfitLoading={llmfitLoading} />
            <OllamaEndpointCard
              t={t}
              isBusy={isBusy}
              ollamaConfig={ollamaConfig}
              onSaveOllamaConfig={onSaveOllamaConfig}
            />
          </div>
        )}
      </section>
    </div>
  );
}

interface PathCardProps {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  recommended?: string;
  connectedBadge?: string | null;
  onActivate: () => void;
  activateLabel: string;
  children?: React.ReactNode;
}

function PathCard({
  active,
  icon,
  title,
  desc,
  recommended,
  connectedBadge,
  onActivate,
  activateLabel,
  children,
}: PathCardProps) {
  return (
    <div
      className={`rounded-panel border bg-surface transition-colors ${
        active ? "border-accent ring-1 ring-accent/30" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control border ${
            active ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-bg text-muted"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-fg">{title}</p>
            {recommended && (
              <span className="rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                {recommended}
              </span>
            )}
            {connectedBadge && (
              <span className="flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {connectedBadge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted">{desc}</p>
        </div>
        {!active && (
          <button
            type="button"
            onClick={onActivate}
            className="shrink-0 rounded-control border border-border bg-panel px-2.5 py-1 text-[11px] font-medium text-fg-secondary hover:border-accent hover:text-accent transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {activateLabel}
          </button>
        )}
      </div>
      {active && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}
