import {
  ApiKeysCard,
  EmbeddingCard,
  LlmfitCard,
  LocalLlmCard,
  ModelLibraryCard,
  RebuildMemoryCard,
  type ModelTabProps,
  type SemanticSearchState,
} from "./modelTabSections";

export type { SemanticSearchState };

export function ModelTab({
  t,
  isBusy,
  onRebuildMemory,
  localLlmEnabled,
  localLlmModelPath,
  openaiApiKey,
  geminiApiKey,
  onSaveLlmKeys,
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
  return (
    <div className="space-y-6 p-1">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-fg">{t("settings.localLlm.title")}</h3>
        <p className="text-xs text-muted">{t("settings.localLlm.desc")}</p>
      </div>

      <LocalLlmCard
        t={t}
        isBusy={isBusy}
        localLlmEnabled={localLlmEnabled}
        localLlmModelPath={localLlmModelPath}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
        onDownloadLocalModel={onDownloadLocalModel}
        onToggleLocalLlm={onToggleLocalLlm}
      />

      <ModelLibraryCard
        t={t}
        isBusy={isBusy}
        isDownloading={isDownloading}
        onDownloadLocalModel={onDownloadLocalModel}
        onSearchHfModels={onSearchHfModels}
        onGetHfModelFiles={onGetHfModelFiles}
      />

      <EmbeddingCard
        t={t}
        isBusy={isBusy}
        embeddingStatus={embeddingStatus}
        embeddingProgress={embeddingProgress}
        embeddingDownloading={embeddingDownloading}
        onDownloadEmbeddingModel={onDownloadEmbeddingModel}
        semanticSearchState={semanticSearchState}
      />

      <LlmfitCard
        t={t}
        llmfitResult={llmfitResult}
        llmfitLoading={llmfitLoading}
      />

      <RebuildMemoryCard
        t={t}
        isBusy={isBusy}
        onRebuildMemory={onRebuildMemory}
      />

      <ApiKeysCard
        key={`${openaiApiKey}\u0000${geminiApiKey}`}
        t={t}
        isBusy={isBusy}
        openaiApiKey={openaiApiKey}
        geminiApiKey={geminiApiKey}
        onSaveLlmKeys={onSaveLlmKeys}
      />
    </div>
  );
}
