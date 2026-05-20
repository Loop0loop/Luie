import { useState, useMemo, useEffect, useRef } from "react";
import type { TFunction } from "i18next";
import {
  Search, Cpu, Download, Info, RefreshCw, Check, AlertCircle, Settings2, ChevronRight, Loader2
} from "lucide-react";

import { Button } from "@renderer/components/ui/button";
import type {
  LlmModelDownloadStatus,
  LlmModelSettingsView,
  MigrationHealth,
  HfModelSearchResult,
  HfModelFile,
} from "@shared/types";

interface ModelTabProps {
  t: TFunction;
  modelView: LlmModelSettingsView;
  isBusy: boolean;
  manualModelPath: string;
  onChangeManualPath: (value: string) => void;
  onRefresh: () => void;
  onDownloadDefault: () => void;
  onSaveManualPath: () => void;
  onSelectModel: (modelPath: string, modelId: string) => void;
  hfToken: string;
  onChangeHfToken: (value: string) => void;
  onSaveHfToken: () => void;
  onSaveRuntimeSettings: (input: {
    contextSize?: number;
    gpuLayers?: number;
    ragTemperature?: number;
    ragMaxTokens?: number;
  }) => void;
  hfSearchResults: HfModelSearchResult[];
  hfModelFiles: HfModelFile[];
  isHfSearching: boolean;
  onHfSearch: (query: string) => void;
  onGetHfModelFiles: (repoId: string) => void;
  onDownloadHfModel: (repoId: string, filename: string, modelId: string) => void;
  downloadStatus: LlmModelDownloadStatus;
  migrationHealth: MigrationHealth | null;
  onRefreshMigrationHealth: () => void;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value;
  let unit = -1;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(2)} ${units[unit]}`;
}

function timeAgo(dateString: string, t: TFunction): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t("time.justNow", { defaultValue: "방금 전" });
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}${t("time.minutesAgo", { defaultValue: "분 전" })}`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}${t("time.hoursAgo", { defaultValue: "시간 전" })}`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}${t("time.daysAgo", { defaultValue: "일 전" })}`;
  return date.toLocaleDateString();
}

export function ModelTab(props: ModelTabProps) {
  const {
    modelView,
    isBusy,
    manualModelPath,
    onChangeManualPath,
    onRefresh,
    onDownloadDefault,
    onSaveManualPath,
    onSelectModel,
    hfToken,
    onChangeHfToken,
    onSaveHfToken,
    onSaveRuntimeSettings,
    hfSearchResults,
    hfModelFiles,
    isHfSearching,
    onHfSearch,
    onGetHfModelFiles,
    onDownloadHfModel,
    downloadStatus,
    migrationHealth,
    onRefreshMigrationHealth,
    t,
  } = props;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const [contextSize, setContextSize] = useState<number>(modelView.contextSize ?? 8192);
  const [gpuLayers, setGpuLayers] = useState<number>(modelView.gpuLayers ?? 999);
  const [ragTemperature, setRagTemperature] = useState<number>(modelView.ragTemperature ?? 0.2);
  const [ragMaxTokens, setRagMaxTokens] = useState<number>(modelView.ragMaxTokens ?? 1200);

  const [hfQuery, setHfQuery] = useState("");
  const [selectedHfRepo, setSelectedHfRepo] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!hfQuery.trim()) return;
    searchTimerRef.current = setTimeout(() => onHfSearch(hfQuery), 500);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [hfQuery, onHfSearch]);

  const filteredModels = useMemo(() => {
    if (!searchQuery) return modelView.models;
    return modelView.models.filter((m) =>
      m.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [modelView.models, searchQuery]);

  const effectiveSelectedModelId = useMemo(() => {
    if (modelView.models.length === 0) return null;

    // If we have a selected ID, and it's in the filtered list, use it
    if (selectedModelId && filteredModels.some(m => m.id === selectedModelId)) {
      return selectedModelId;
    }

    // Fallbacks
    if (filteredModels.length > 0) {
      if (!searchQuery) {
        return modelView.models.find(m => m.isDefault)?.id ?? modelView.models[0].id;
      } else {
        return filteredModels[0].id;
      }
    }

    return null;
  }, [modelView.models, filteredModels, selectedModelId, searchQuery]);

  const selectedModel = useMemo(
    () => modelView.models.find((m) => m.id === effectiveSelectedModelId),
    [modelView.models, effectiveSelectedModelId]
  );

  const otherModels = useMemo(
    () => filteredModels.filter((m) => m.id !== effectiveSelectedModelId),
    [filteredModels, effectiveSelectedModelId]
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-fg">
            {t("settings.model.title", { defaultValue: "Local Model" })}
          </h3>
          <p className="text-sm text-muted mt-1">
            {t("settings.model.subtitle", { defaultValue: "Luie memory engine / writing assistant" })}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("settings.model.searchPlaceholder", { defaultValue: "Search models by name..." })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {downloadStatus.error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-sm text-destructive">
                {t("settings.model.downloadError", { defaultValue: "다운로드 오류" })}: {downloadStatus.error}
              </span>
            </div>
          </div>
        )}
        {downloadStatus.active && (
          <div className="bg-accent/10 border border-accent rounded-xl p-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-medium text-accent truncate max-w-[70%]">
                {t("settings.model.downloading", { defaultValue: "다운로드 중" })}: {downloadStatus.fileName}
              </span>
              <span className="text-xs font-medium text-accent shrink-0">
                {downloadStatus.percent !== null ? `${downloadStatus.percent.toFixed(1)}%` : ""}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-accent/20 overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${downloadStatus.percent ?? 0}%` }}
              />
            </div>
            {downloadStatus.totalBytes !== null && (
              <div className="mt-1.5 text-xs text-accent/70 text-right">
                {formatBytes(downloadStatus.downloadedBytes)} / {formatBytes(downloadStatus.totalBytes)}
              </div>
            )}
          </div>
        )}

        {/* Selected Model Section */}
        {selectedModel ? (
          <div className="p-4 rounded-xl border border-border bg-surface">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-element border border-border flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5 text-muted" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-fg truncate">
                      {selectedModel.fileName}
                    </h4>
                    {selectedModel.isDefault && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent border border-accent/20 shrink-0">
                        {t("settings.model.inUse", { defaultValue: "사용 중" })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1 truncate">
                    {selectedModel.path}
                  </p>
                </div>
              </div>
              <Button
                variant={selectedModel.isDefault ? "secondary" : "default"}
                onClick={() => onSelectModel(selectedModel.path, selectedModel.id)}
                disabled={isBusy || selectedModel.isDefault}
                className="shrink-0"
              >
                {selectedModel.isDefault
                  ? t("settings.model.inUse", { defaultValue: "현재 사용 중" })
                  : t("settings.model.useSelected", { defaultValue: "적용하기" })}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-element border border-border">
                <div className="text-[10px] font-medium text-muted uppercase">Size</div>
                <div className="text-sm font-medium text-fg mt-1">
                  {formatBytes(selectedModel.sizeBytes)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-element border border-border">
                <div className="text-[10px] font-medium text-muted uppercase">Format</div>
                <div className="text-sm font-medium text-fg mt-1">GGUF</div>
              </div>
              <div className="p-3 rounded-lg bg-element border border-border">
                <div className="text-[10px] font-medium text-muted uppercase">Updated</div>
                <div className="text-sm font-medium text-fg mt-1">
                  {timeAgo(selectedModel.modifiedAt, t)}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-element border border-border">
              <div className="flex items-center gap-2 text-xs font-medium text-fg mb-1">
                <Info className="w-4 h-4 text-muted" />
                {t("settings.model.note", { defaultValue: "Model Note" })}
              </div>
              <p className="text-xs text-muted">
                {t("settings.model.descriptionBox", { defaultValue: "Gemma is a family of open models built for text and image input. Use this profile for lightweight local reasoning and draft inspection inside Luie." })}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-muted border border-dashed border-border rounded-xl">
            <Cpu className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm">{t("settings.model.noModels", { defaultValue: "검색 결과가 없거나 모델이 존재하지 않습니다." })}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={onDownloadDefault}
              disabled={isBusy}
            >
              <Download className="w-4 h-4 mr-2" />
              {t("settings.model.downloadDefault", { defaultValue: "기본 모델 다운로드" })}
            </Button>
          </div>
        )}
      </section>

      {/* HF Model Search — LM Studio style */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted" />
          <h4 className="text-sm font-semibold text-fg">
            {t("settings.model.hfSearch", { defaultValue: "HuggingFace 모델 검색" })}
          </h4>
          {isHfSearching && <Loader2 className="w-3 h-3 text-muted animate-spin" />}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={hfQuery}
            onChange={(e) => setHfQuery(e.target.value)}
            placeholder={t("settings.model.hfSearchPlaceholder", { defaultValue: "모델명 검색 (예: Qwen3, Llama, Gemma...)" })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        {hfSearchResults.length > 0 && (
          <div className="space-y-1 max-h-60 overflow-y-auto rounded-lg border border-border">
            {hfSearchResults.map((model) => (
              <button
                key={model.modelId}
                onClick={() => {
                  setSelectedHfRepo(model.modelId);
                  onGetHfModelFiles(model.modelId);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-element ${selectedHfRepo === model.modelId ? "bg-accent/10 border-l-2 border-accent" : ""}`}
              >
                <div className="min-w-0">
                  <div className="font-medium text-fg truncate">{model.modelId}</div>
                  <div className="text-xs text-muted mt-0.5">
                    ↓ {model.downloads.toLocaleString()} · ♥ {model.likes.toLocaleString()}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}
        {selectedHfRepo && hfModelFiles.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-2 bg-element border-b border-border">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                {t("settings.model.availableFiles", { defaultValue: "GGUF 파일 선택" })} — {selectedHfRepo}
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {hfModelFiles.map((file) => (
                <div
                  key={file.filename}
                  className="flex items-center justify-between px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-element transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-fg truncate">{file.filename}</div>
                    {file.size !== null && (
                      <div className="text-xs text-muted mt-0.5">{formatBytes(file.size)}</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 ml-3"
                    disabled={isBusy || downloadStatus.active}
                    onClick={() => onDownloadHfModel(selectedHfRepo, file.filename, `${selectedHfRepo.split("/")[1] ?? selectedHfRepo}-${file.filename}`)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {t("settings.model.download", { defaultValue: "다운로드" })}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {otherModels.length > 0 && (
        <>
          <div className="h-px bg-border my-6" />
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-fg">
                {t("settings.model.otherModels", { defaultValue: "Other Models" })}
              </h3>
              <span className="text-sm text-muted">{otherModels.length} models</span>
            </div>
            <div className="space-y-2">
              {otherModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-surface hover:bg-element-hover transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-element border border-border flex items-center justify-center shrink-0">
                      <Cpu className="w-4 h-4 text-muted" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-fg">{model.fileName}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {formatBytes(model.sizeBytes)} · GGUF
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="h-px bg-border my-6" />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-fg">
            {t("settings.model.dbHealth", { defaultValue: "DB Health" })}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshMigrationHealth}
            disabled={isBusy}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("settings.model.refresh", { defaultValue: "새로고침" })}
          </Button>
        </div>
        {migrationHealth ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-element border border-border">
              <div className="text-[10px] font-medium text-muted uppercase">Vector</div>
              <div className="text-sm font-medium text-fg mt-1">
                {migrationHealth.vectorSearchEnabled
                  ? t("settings.model.vectorEnabled", { defaultValue: "Enabled" })
                  : t("settings.model.vectorDisabled", { defaultValue: "Disabled" })}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-element border border-border">
              <div className="text-[10px] font-medium text-muted uppercase">Embeddings</div>
              <div className="text-sm font-medium text-fg mt-1">
                {t("settings.model.invalidEmbeddingCount", {
                  defaultValue: "Invalid: {{count}}",
                  count: migrationHealth.invalidEmbeddingCount,
                })}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-element border border-border">
              <div className="text-[10px] font-medium text-muted uppercase">ChapterBody</div>
              <div className="text-sm font-medium text-fg mt-1">
                {t("settings.model.missingBodyCount", {
                  defaultValue: "Missing: {{count}}",
                  count: migrationHealth.missingBodyCount,
                })}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-element border border-border">
              <div className="text-[10px] font-medium text-muted uppercase">Hash</div>
              <div className="text-sm font-medium text-fg mt-1">
                {t("settings.model.hashMismatchCount", {
                  defaultValue: "Mismatch: {{count}}",
                  count: migrationHealth.hashMismatchCount,
                })}
                {migrationHealth.hashMismatchSampled && " (sampled)"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-element border border-border">
              <div className="text-[10px] font-medium text-muted uppercase">Relation</div>
              <div className="text-sm font-medium text-fg mt-1">
                {t("settings.model.relationPointerMismatchCount", {
                  defaultValue: "Pointer mismatch: {{count}}",
                  count: migrationHealth.relationPointerMismatchCount,
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-element border border-border text-sm text-muted">
            {t("settings.model.healthUnavailable", {
              defaultValue: "진단 정보를 불러오지 못했습니다.",
            })}
          </div>
        )}
      </section>

      <div className="h-px bg-border my-6" />

      <section className="space-y-4">
        <h3 className="text-base font-semibold text-fg">
          {t("settings.model.advanced", { defaultValue: "Advanced Configuration" })}
        </h3>

        {/* Repo Dir */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h4 className="text-sm font-medium text-fg">
              {t("settings.model.repoLocation", { defaultValue: "저장소 위치" })}
            </h4>
            <p className="text-xs text-muted mt-0.5 truncate">
              {modelView.modelsDir || "-"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isBusy} className="shrink-0">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("settings.model.refresh", { defaultValue: "새로고침" })}
          </Button>
        </div>

        {/* HF Token */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h4 className="text-sm font-medium text-fg">
              {t("settings.model.hfToken", { defaultValue: "Hugging Face 토큰" })}
            </h4>
            <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
              {modelView.hasHuggingFaceToken ? (
                <>
                  <Check className="w-3 h-3 text-accent" />
                  <span className="text-accent">{t("settings.model.saved", { defaultValue: "저장됨" })}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-yellow-500" />
                  <span className="text-yellow-500">{t("settings.model.notSet", { defaultValue: "미설정" })}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="password"
              value={hfToken}
              onChange={(e) => onChangeHfToken(e.target.value)}
              placeholder="hf_..."
              className="w-48 px-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button size="sm" onClick={onSaveHfToken} disabled={isBusy || !hfToken}>
              {t("settings.model.save", { defaultValue: "저장" })}
            </Button>
          </div>
        </div>

        {/* Manual Path */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h4 className="text-sm font-medium text-fg">
              {t("settings.model.manualConnect", { defaultValue: "수동 모델 연결" })}
            </h4>
            <p className="text-xs text-muted mt-0.5">
              {t("settings.model.manualConnectDesc", { defaultValue: "외부 모델 직접 연결" })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={manualModelPath}
              onChange={(e) => onChangeManualPath(e.target.value)}
              placeholder={t("settings.model.manualConnectPlaceholder", { defaultValue: "모델 절대 경로 입력..." })}
              className="w-48 px-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button size="sm" onClick={onSaveManualPath} disabled={isBusy || !manualModelPath}>
              {t("settings.model.save", { defaultValue: "저장" })}
            </Button>
          </div>
        </div>
      </section>

      <div className="h-px bg-border my-6" />

      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted" />
          <h3 className="text-base font-semibold text-fg">
            {t("settings.model.runtimeSettings", { defaultValue: "Runtime Settings" })}
          </h3>
        </div>
        <p className="text-xs text-muted -mt-3">
          {t("settings.model.runtimeSettingsDesc", { defaultValue: "모델 재시작 후 적용됩니다." })}
        </p>

        {/* Context Size */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-fg">
              {t("settings.model.contextSize", { defaultValue: "Context Size (tokens)" })}
            </label>
            <span className="text-sm font-mono text-accent">{contextSize.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={2048}
            max={32768}
            step={1024}
            value={contextSize}
            onChange={(e) => setContextSize(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>2K</span><span>8K</span><span>16K</span><span>32K</span>
          </div>
        </div>

        {/* GPU Layers */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-fg">
              {t("settings.model.gpuLayers", { defaultValue: "GPU Layers (Metal)" })}
            </label>
            <span className="text-sm font-mono text-accent">
              {gpuLayers >= 999 ? t("settings.model.gpuLayersAll", { defaultValue: "All" }) : gpuLayers}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={999}
            step={1}
            value={gpuLayers}
            onChange={(e) => setGpuLayers(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>CPU only</span><span>All GPU</span>
          </div>
        </div>

        {/* RAG Temperature */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-fg">
              {t("settings.model.ragTemperature", { defaultValue: "RAG Temperature" })}
            </label>
            <span className="text-sm font-mono text-accent">{ragTemperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={ragTemperature}
            onChange={(e) => setRagTemperature(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>0 (결정적)</span><span>1 (창의적)</span>
          </div>
        </div>

        {/* RAG Max Tokens */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-fg">
              {t("settings.model.ragMaxTokens", { defaultValue: "RAG Max Output Tokens" })}
            </label>
            <span className="text-sm font-mono text-accent">{ragMaxTokens}</span>
          </div>
          <input
            type="range"
            min={256}
            max={4096}
            step={64}
            value={ragMaxTokens}
            onChange={(e) => setRagMaxTokens(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-muted">
            <span>256</span><span>2048</span><span>4096</span>
          </div>
        </div>

        <Button
          onClick={() => onSaveRuntimeSettings({ contextSize, gpuLayers, ragTemperature, ragMaxTokens })}
          disabled={isBusy}
          className="w-full"
        >
          {t("settings.model.saveRuntimeSettings", { defaultValue: "런타임 설정 저장" })}
        </Button>
      </section>
    </div>
  );
}
