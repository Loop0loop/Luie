import { useCallback, useState } from "react";
import type { TFunction } from "i18next";
import { CheckCircle, Download, HardDrive, Loader2, Search } from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import type { HfModelFile, HfModelSearchResult } from "@shared/types";

interface ModelTabProps {
  t: TFunction;
  isBusy: boolean;
  onRebuildMemory: () => Promise<void>;
  localLlmEnabled: boolean;
  localLlmModelPath?: string;
  isDownloading: boolean;
  downloadProgress: { stage: "binary" | "model" | "complete" | "error"; pct: number; error?: string } | null;
  onDownloadLocalModel: (opts?: { repo: string; filename: string }) => Promise<void>;
  onSearchHfModels: (query: string) => Promise<HfModelSearchResult[]>;
  onGetHfModelFiles: (repoId: string) => Promise<HfModelFile[]>;
  onToggleLocalLlm: (enabled: boolean) => Promise<void>;
}

export function ModelTab({
  t,
  isBusy,
  onRebuildMemory,
  localLlmEnabled,
  localLlmModelPath,
  isDownloading,
  downloadProgress,
  onDownloadLocalModel,
  onSearchHfModels,
  onGetHfModelFiles,
  onToggleLocalLlm,
}: ModelTabProps) {
  const [hfQuery, setHfQuery] = useState("");
  const [hfResults, setHfResults] = useState<HfModelSearchResult[]>([]);
  const [hfFiles, setHfFiles] = useState<HfModelFile[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<HfModelFile | null>(null);
  const [hfSearching, setHfSearching] = useState(false);
  const [hfFilesLoading, setHfFilesLoading] = useState(false);
  const [hasHfSearched, setHasHfSearched] = useState(false);
  const [hfError, setHfError] = useState<string | null>(null);

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

  const getModelTitle = useCallback((repoId: string): string => {
    const segments = repoId.split("/");
    return segments[segments.length - 1] ?? repoId;
  }, []);

  const getModelOwner = useCallback((repoId: string): string => {
    return repoId.split("/")[0] ?? "";
  }, []);

  const getFileProfile = useCallback((filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes("q8")) return t("settings.localLlm.modelLibrary.profileQuality");
    if (lower.includes("q5")) return t("settings.localLlm.modelLibrary.profileBalanced");
    if (lower.includes("q4")) return t("settings.localLlm.modelLibrary.profileFast");
    return t("settings.localLlm.modelLibrary.profileStandard");
  }, [t]);

  const getInstalledModelName = useCallback((modelPath?: string): string => {
    if (!modelPath) return "";
    const normalized = modelPath.replace(/\\/g, "/");
    const parts = normalized.split("/");
    return parts[parts.length - 1] ?? modelPath;
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
    setHfError(null);
    try {
      const results = await onSearchHfModels(query);
      setHfResults(results);
      setHasHfSearched(true);
    } catch (error) {
      setHasHfSearched(true);
      setHfError(error instanceof Error ? error.message : t("settings.localLlm.modelLibrary.searchError"));
    } finally {
      setHfSearching(false);
    }
  }, [hfQuery, onSearchHfModels, t]);

  const handleSelectRepo = useCallback(async (repoId: string) => {
    setSelectedRepo(repoId);
    setSelectedFile(null);
    setHfFiles([]);
    setHfFilesLoading(true);
    setHfError(null);
    try {
      setHfFiles(await onGetHfModelFiles(repoId));
    } catch (error) {
      setHfError(error instanceof Error ? error.message : t("settings.localLlm.modelLibrary.fileFetchError"));
    } finally {
      setHfFilesLoading(false);
    }
  }, [onGetHfModelFiles, t]);

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
        <h3 className="text-sm font-semibold text-fg">{t("settings.localLlm.title")}</h3>
        <p className="text-xs text-muted">{t("settings.localLlm.desc")}</p>
      </div>

      <div className="rounded-control bg-surface border border-border p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-fg-secondary">{t("settings.localLlm.enabled")}</p>
            <p className="text-xs text-muted">{t("settings.localLlm.toggleHelp")}</p>
          </div>
          <button
            type="button"
            aria-label={t("settings.localLlm.enabled")}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              localLlmEnabled ? "bg-accent" : "bg-border"
            } ${!localLlmModelPath ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            onClick={() => void onToggleLocalLlm(!localLlmEnabled)}
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
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{t("settings.localLlm.modelReady")}</span>
            </div>
            <p className="text-xs text-muted">
              {t("settings.localLlm.currentModel")}: {getInstalledModelName(localLlmModelPath)}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted">{t("settings.localLlm.noModel")}</p>
        )}

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
          <p className="text-xs text-danger">{downloadProgress.error}</p>
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

        <div className="border-t border-border pt-3 space-y-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control border border-border bg-bg text-muted">
              <HardDrive className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-fg-secondary">
                {t("settings.localLlm.modelLibrary.title")}
              </p>
              <p className="text-xs text-muted">
                {t("settings.localLlm.modelLibrary.description")}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={hfQuery}
              onChange={(e) => setHfQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleHfSearch();
              }}
              placeholder={t("settings.localLlm.modelLibrary.placeholder")}
              className="min-w-0 flex-1 rounded-control border border-border bg-panel px-control-x py-control-y text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
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
                  ? t("settings.localLlm.modelLibrary.searching")
                  : t("settings.localLlm.modelLibrary.searchBtn")}
              </span>
            </Button>
          </div>

          {hfResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-control border border-border bg-panel">
              {hfResults.map((result) => (
                <button
                  key={result.repoId}
                  type="button"
                  onClick={() => void handleSelectRepo(result.repoId)}
                  className={`flex w-full items-start justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-hover ${
                    selectedRepo === result.repoId ? "bg-active" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-fg">
                      {getModelTitle(result.repoId)}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {getModelOwner(result.repoId)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-control border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
                    {t("settings.localLlm.modelLibrary.popular")}: {result.downloads.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!hfSearching && hasHfSearched && hfResults.length === 0 && (
            <p className="text-xs text-muted">{t("settings.localLlm.modelLibrary.noResults")}</p>
          )}
          {hfError && <p className="text-xs text-danger">{hfError}</p>}

          {selectedRepo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-fg-secondary">
                  {t("settings.localLlm.modelLibrary.selectFile")}
                </p>
                {hfFilesLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
              </div>
              {hfFiles.length > 0 ? (
                <div className="max-h-44 overflow-y-auto rounded-control border border-border bg-panel">
                  {hfFiles.map((file) => (
                    <button
                      key={file.filename}
                      type="button"
                      onClick={() => setSelectedFile(file)}
                      className={`flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-surface-hover ${
                        selectedFile?.filename === file.filename ? "bg-active" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-fg">{file.filename}</span>
                        <span className="text-[11px] text-muted">{getFileProfile(file.filename)}</span>
                      </span>
                      <span className="shrink-0 rounded-control border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                !hfFilesLoading && (
                  <p className="text-xs text-muted">{t("settings.localLlm.modelLibrary.noFiles")}</p>
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
                <span className="ml-1.5">{t("settings.localLlm.modelLibrary.downloadSelected")}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-control bg-surface border border-border p-3 space-y-2">
        <p className="text-xs font-medium text-fg-secondary">{t("settings.localLlm.rebuildMemory.title")}</p>
        <p className="text-xs text-muted">{t("settings.localLlm.rebuildMemory.description")}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void onRebuildMemory()}
          disabled={isBusy}
          className="w-full"
        >
          {t("settings.localLlm.rebuildMemory.start")}
        </Button>
      </div>
    </div>
  );
}
