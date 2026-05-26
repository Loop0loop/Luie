import { useState, useEffect, useCallback } from "react";
import type { TFunction } from "i18next";
import { CheckCircle, XCircle, RefreshCw, Loader2, Search, Download } from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import type { HfModelFile, HfModelSearchResult } from "@shared/types";

interface ModelTabProps {
  t: TFunction;
  isBusy: boolean;
  onSaveOllamaConfig: (input: { baseUrl: string; chatModel: string; embeddingModel?: string; apiKey?: string }) => Promise<boolean>;
  onListOllamaModels: (baseUrl: string) => Promise<string[]>;
  onTestOllamaConnection: (baseUrl: string) => Promise<boolean>;
  onRebuildMemory: () => Promise<void>;
  localLlmEnabled: boolean;
  localLlmModelPath?: string;
  isDownloading: boolean;
  downloadProgress: { stage: "binary" | "model" | "complete" | "error"; pct: number; error?: string } | null;
  onDownloadLocalModel: (opts?: { repo: string; filename: string }) => Promise<void>;
  onSearchHfModels: (query: string) => Promise<HfModelSearchResult[]>;
  onGetHfModelFiles: (repoId: string) => Promise<HfModelFile[]>;
  onToggleLocalLlm: (enabled: boolean) => Promise<void>;
  initialBaseUrl?: string;
  initialChatModel?: string;
  initialEmbeddingModel?: string;
  initialApiKey?: string;
}

export function ModelTab({
  t,
  isBusy,
  onSaveOllamaConfig,
  onListOllamaModels,
  onTestOllamaConnection,
  onRebuildMemory,
  localLlmEnabled,
  localLlmModelPath,
  isDownloading,
  downloadProgress,
  onDownloadLocalModel,
  onSearchHfModels,
  onGetHfModelFiles,
  onToggleLocalLlm,
  initialBaseUrl = "http://localhost:11434",
  initialChatModel = "",
  initialEmbeddingModel = "",
  initialApiKey = "",
}: ModelTabProps) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [chatModel, setChatModel] = useState(initialChatModel);
  const [embeddingModel, setEmbeddingModel] = useState(initialEmbeddingModel);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [models, setModels] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [modelsLoading, setModelsLoading] = useState(false);
  const [hfQuery, setHfQuery] = useState("");
  const [hfResults, setHfResults] = useState<HfModelSearchResult[]>([]);
  const [hfFiles, setHfFiles] = useState<HfModelFile[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<HfModelFile | null>(null);
  const [hfSearching, setHfSearching] = useState(false);
  const [hfFilesLoading, setHfFilesLoading] = useState(false);
  const [hasHfSearched, setHasHfSearched] = useState(false);

  const loadModels = useCallback(async (url: string) => {
    if (!url) return;
    setModelsLoading(true);
    try {
      const list = await onListOllamaModels(url);
      setModels(list);
    } finally {
      setModelsLoading(false);
    }
  }, [onListOllamaModels]);

  // Sync when parent async-loads stored config
  useEffect(() => {
    setBaseUrl(initialBaseUrl);
  }, [initialBaseUrl]);

  useEffect(() => {
    setChatModel(initialChatModel);
  }, [initialChatModel]);

  useEffect(() => {
    setEmbeddingModel(initialEmbeddingModel);
  }, [initialEmbeddingModel]);

  useEffect(() => {
    setApiKey(initialApiKey);
  }, [initialApiKey]);

  useEffect(() => {
    if (initialBaseUrl) void loadModels(initialBaseUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBaseUrl]);

  const handleTestConnection = useCallback(async () => {
    setConnectionStatus("testing");
    const ok = await onTestOllamaConnection(baseUrl);
    setConnectionStatus(ok ? "ok" : "fail");
    if (ok) {
      await loadModels(baseUrl);
    }
  }, [baseUrl, onTestOllamaConnection, loadModels]);

  const handleSave = useCallback(async () => {
    await onSaveOllamaConfig({
      baseUrl,
      chatModel,
      embeddingModel: embeddingModel.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
    });
  }, [baseUrl, chatModel, embeddingModel, apiKey, onSaveOllamaConfig]);

  const formatBytes = useCallback((bytes: number): string => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "-";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
  }, []);

  const handleHfSearch = useCallback(async () => {
    const query = hfQuery.trim();
    if (!query) return;
    setHfSearching(true);
    setHfResults([]);
    setHfFiles([]);
    setSelectedRepo(null);
    setSelectedFile(null);
    setHasHfSearched(false);
    try {
      const results = await onSearchHfModels(query);
      setHfResults(results);
      setHasHfSearched(true);
    } finally {
      setHfSearching(false);
    }
  }, [hfQuery, onSearchHfModels]);

  const handleSelectRepo = useCallback(async (repoId: string) => {
    setSelectedRepo(repoId);
    setSelectedFile(null);
    setHfFiles([]);
    setHfFilesLoading(true);
    try {
      setHfFiles(await onGetHfModelFiles(repoId));
    } finally {
      setHfFilesLoading(false);
    }
  }, [onGetHfModelFiles]);

  const handleDownloadSelected = useCallback(async () => {
    if (!selectedRepo || !selectedFile) return;
    await onDownloadLocalModel({
      repo: selectedRepo,
      filename: selectedFile.filename,
    });
  }, [onDownloadLocalModel, selectedFile, selectedRepo]);

  return (
    <div className="space-y-6 p-1">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-fg">AI 모델 설정</h3>
        <p className="text-xs text-muted">Ollama를 통해 로컬 LLM을 사용합니다.</p>
      </div>

      {/* Ollama URL */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fg-secondary">Ollama 서버 URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setConnectionStatus("idle");
            }}
            placeholder="http://localhost:11434"
            className="flex-1 text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleTestConnection()}
            disabled={!baseUrl || connectionStatus === "testing"}
          >
            {connectionStatus === "testing" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span className="ml-1.5">연결 테스트</span>
          </Button>
        </div>

        {connectionStatus === "ok" && (
          <div className="flex items-center gap-1.5 text-xs text-green-500">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>연결됨</span>
          </div>
        )}
        {connectionStatus === "fail" && (
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <XCircle className="w-3.5 h-3.5" />
            <span>연결 실패 — Ollama가 실행 중인지 확인하세요.</span>
          </div>
        )}
      </div>

      {/* Model selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fg-secondary">모델 선택</label>
        {modelsLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted py-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>모델 목록 로드 중...</span>
          </div>
        ) : models.length > 0 ? (
          <select
            value={chatModel}
            onChange={(e) => setChatModel(e.target.value)}
            className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-1.5 appearance-none text-fg focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">모델을 선택하세요</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <div className="space-y-1">
            <input
              type="text"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              placeholder="예: qwen3:4b"
              className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="text-xs text-muted">서버에 연결 후 목록이 자동으로 표시됩니다.</p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fg-secondary">임베딩 모델 (선택)</label>
        <input
          type="text"
          value={embeddingModel}
          onChange={(e) => setEmbeddingModel(e.target.value)}
          placeholder="예: nomic-embed-text"
          className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <p className="text-xs text-muted">벡터 검색에 사용됩니다. 비워두면 채팅 모델을 사용합니다.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-fg-secondary">API Key (선택)</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="필요한 provider에서만 사용됩니다"
          className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Save button */}
      <Button
        onClick={() => void handleSave()}
        disabled={isBusy || !baseUrl || !chatModel}
        className="w-full"
      >
        저장
      </Button>

      <div className="rounded-lg bg-surface border border-border p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-fg-secondary">{t("settings.localLlm.title")}</p>
            <p className="text-xs text-muted">{t("settings.localLlm.desc")}</p>
          </div>
          <button
            type="button"
            aria-label={t("settings.localLlm.enabled")}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              localLlmEnabled ? "bg-accent" : "bg-border"
            } ${!localLlmModelPath ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            onClick={() => {
              if (localLlmModelPath) void onToggleLocalLlm(!localLlmEnabled);
            }}
            disabled={!localLlmModelPath}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                localLlmEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {localLlmModelPath ? (
          <div className="flex items-center gap-1.5 text-xs text-green-500">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{t("settings.localLlm.modelReady")}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted">{t("settings.localLlm.noModel")}</p>

            {isDownloading && downloadProgress && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {downloadProgress.stage === "binary"
                      ? t("settings.localLlm.downloadingBinary")
                      : t("settings.localLlm.downloadingModel")}
                  </span>
                  <span>{downloadProgress.pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${downloadProgress.pct}%` }}
                  />
                </div>
              </div>
            )}

            {downloadProgress?.error && (
              <p className="text-xs text-red-500">{downloadProgress.error}</p>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => void onDownloadLocalModel()}
              disabled={isDownloading || isBusy}
              className="w-full"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="ml-1.5">{t("settings.localLlm.downloading")}</span>
                </>
              ) : (
                t("settings.localLlm.download")
              )}
            </Button>
          </div>
        )}

        <div className="border-t border-border pt-3 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-fg-secondary">
              {t("settings.localLlm.hfSearch.title")}
            </p>
            <p className="text-xs text-muted">
              {t("settings.localLlm.hfSearch.description")}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={hfQuery}
              onChange={(e) => setHfQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleHfSearch();
              }}
              placeholder={t("settings.localLlm.hfSearch.placeholder")}
              className="min-w-0 flex-1 text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void handleHfSearch()}
              disabled={hfSearching || !hfQuery.trim()}
            >
              {hfSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span className="ml-1.5">
                {hfSearching
                  ? t("settings.localLlm.hfSearch.searching")
                  : t("settings.localLlm.hfSearch.searchBtn")}
              </span>
            </Button>
          </div>

          {hfResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
              {hfResults.map((result) => (
                <button
                  key={result.repoId}
                  type="button"
                  onClick={() => void handleSelectRepo(result.repoId)}
                  className={`flex w-full items-start justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-bg ${
                    selectedRepo === result.repoId ? "bg-bg" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-fg">
                      {result.repoId}
                    </span>
                    <span className="text-[11px] text-muted">
                      {t("settings.localLlm.hfSearch.downloads")}: {result.downloads.toLocaleString()} · {t("settings.localLlm.hfSearch.likes")}: {result.likes.toLocaleString()}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {!hfSearching && hasHfSearched && hfResults.length === 0 && (
            <p className="text-xs text-muted">{t("settings.localLlm.hfSearch.noResults")}</p>
          )}

          {selectedRepo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-fg-secondary">
                  {t("settings.localLlm.hfSearch.selectFile")}
                </p>
                {hfFilesLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
              </div>
              {hfFiles.length > 0 ? (
                <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
                  {hfFiles.map((file) => (
                    <button
                      key={file.filename}
                      type="button"
                      onClick={() => setSelectedFile(file)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-bg ${
                        selectedFile?.filename === file.filename ? "bg-bg" : ""
                      }`}
                    >
                      <span className="min-w-0 truncate text-xs text-fg">{file.filename}</span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                !hfFilesLoading && (
                  <p className="text-xs text-muted">{t("settings.localLlm.hfSearch.noFiles")}</p>
                )
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleDownloadSelected()}
                disabled={!selectedFile || isDownloading || isBusy}
                className="w-full"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="ml-1.5">{t("settings.localLlm.hfSearch.downloadSelected")}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Memory rebuild */}
      <div className="rounded-lg bg-surface border border-border p-3 space-y-2">
        <p className="text-xs font-medium text-fg-secondary">메모리 재구성</p>
        <p className="text-xs text-muted">원고 내용이 RAG에 반영되지 않는 경우 실행하세요. 백그라운드로 처리됩니다.</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void onRebuildMemory()}
          disabled={isBusy}
          className="w-full"
        >
          메모리 재구성 시작
        </Button>
      </div>

      {/* Install hint */}
      <div className="rounded-lg bg-surface border border-border p-3 space-y-1.5">
        <p className="text-xs font-medium text-fg-secondary">Ollama 미설치?</p>
        <p className="text-xs text-muted">
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            ollama.com
          </a>
          에서 설치 후 아래 명령어 실행:
        </p>
        <code className="block text-xs bg-bg rounded px-2 py-1 text-fg-secondary">
          ollama pull qwen3:4b
        </code>
      </div>
    </div>
  );
}
