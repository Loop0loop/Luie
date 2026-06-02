import { useCallback, useState } from "react";
import { Download, HardDrive, Loader2, Search } from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import type { HfModelFile, HfModelSearchResult } from "@shared/types";

import {
  formatBytes,
  getFileProfile,
  getModelOwner,
  getModelTitle,
} from "./format";
import type { ModelTabProps } from "./types";

interface ModelLibraryCardProps {
  t: ModelTabProps["t"];
  isBusy: boolean;
  isDownloading: boolean;
  onDownloadLocalModel: ModelTabProps["onDownloadLocalModel"];
  onSearchHfModels: ModelTabProps["onSearchHfModels"];
  onGetHfModelFiles: ModelTabProps["onGetHfModelFiles"];
}

export function ModelLibraryCard({
  t,
  isBusy,
  isDownloading,
  onDownloadLocalModel,
  onSearchHfModels,
  onGetHfModelFiles,
}: ModelLibraryCardProps) {
  const [hfQuery, setHfQuery] = useState("");
  const [hfResults, setHfResults] = useState<HfModelSearchResult[]>([]);
  const [hfFiles, setHfFiles] = useState<HfModelFile[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<HfModelFile | null>(null);
  const [hfSearching, setHfSearching] = useState(false);
  const [hfFilesLoading, setHfFilesLoading] = useState(false);
  const [hasHfSearched, setHasHfSearched] = useState(false);
  const [hfError, setHfError] = useState<string | null>(null);

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
    <div className="rounded-control bg-surface border border-border p-3 space-y-3">
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
                    <span className="text-[11px] text-muted">
                      {getFileProfile(file.filename, t)}
                    </span>
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
  );
}
