import { useState, useMemo } from "react";
import type { TFunction } from "i18next";
import { 
  Search, Cpu, CheckCircle2, HardDrive, Download, Key, 
  Folder, Check, AlertCircle, Eye, Hammer, Info, Bot, ArrowDownToLine, RefreshCw 
} from "lucide-react";
import { cn } from "@renderer/lib/utils";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import type { LlmModelDownloadStatus, LlmModelSettingsView } from "@shared/types";

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
  downloadStatus: LlmModelDownloadStatus;
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
    downloadStatus,
    t,
  } = props;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const filteredModels = useMemo(() => {
    if (!searchQuery) return modelView.models;
    return modelView.models.filter((m) =>
      m.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [modelView.models, searchQuery]);

  // Set initial selected model to default or first
  useMemo(() => {
    if (!selectedModelId && modelView.models.length > 0) {
      const defaultModel = modelView.models.find((m) => m.isDefault);
      setSelectedModelId(defaultModel ? defaultModel.id : modelView.models[0].id);
    }
  }, [modelView.models, selectedModelId]);

  const selectedModel = useMemo(
    () => modelView.models.find((m) => m.id === selectedModelId),
    [modelView.models, selectedModelId]
  );

  const otherModels = useMemo(
    () => filteredModels.filter((m) => m.id !== selectedModelId),
    [filteredModels, selectedModelId]
  );

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto text-foreground font-sans animate-in fade-in pb-10">
      
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-[34px] grid place-items-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 text-accent shadow-sm">
            <Bot className="size-[18px]" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-foreground m-0 leading-[1.2]">
              {t("settings.model.title", { defaultValue: "Local Model" })}
            </h1>
            <div className="text-xs text-muted-foreground mt-[3px]">
              {t("settings.model.subtitle", { defaultValue: "Luie memory engine / writing assistant" })}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-[13px] top-1/2 -translate-y-1/2 size-[18px] text-accent" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("settings.model.searchPlaceholder", { defaultValue: "Search models by name, author, capability..." })}
          className="pl-10 h-[42px] bg-black/40 border-accent/30 focus-visible:ring-accent/20 rounded-[13px] text-[13px]"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 pb-[14px] mb-[4px] border-b border-border/50 overflow-x-auto scrollbar-hide">
        <button className="inline-flex items-center gap-1.5 px-2.5 py-2 border border-accent/30 rounded-full bg-accent/15 text-accent-foreground font-semibold text-xs whitespace-nowrap">
          {t("settings.model.staffPicks", { defaultValue: "Staff Picks" })}
        </button>
        <button className="inline-flex items-center gap-1.5 px-2.5 py-2 border border-white/5 rounded-full bg-white/5 text-[#c5c9d1] hover:text-foreground font-semibold text-xs whitespace-nowrap">
          GGUF
        </button>
        <button className="inline-flex items-center gap-1.5 px-2.5 py-2 border border-white/5 rounded-full bg-white/5 text-[#c5c9d1] hover:text-foreground font-semibold text-xs whitespace-nowrap">
          MLX
        </button>
        <button className="inline-flex items-center gap-1.5 px-2.5 py-2 border border-white/5 rounded-full bg-white/5 text-[#c5c9d1] hover:text-foreground font-semibold text-xs whitespace-nowrap">
          {t("settings.model.bestMatch", { defaultValue: "Best Match" })}
        </button>
      </div>

      {/* Download Status */}
      {downloadStatus.active && (
        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-bold text-accent">
              {t("settings.model.downloading", { defaultValue: "다운로드 중" })}: {downloadStatus.fileName}
            </span>
            <span className="text-xs font-bold text-accent/80">
              {downloadStatus.percent !== null ? `${downloadStatus.percent.toFixed(1)}%` : ""}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-accent/20 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${downloadStatus.percent ?? 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-[10px]">
        {/* Selected Model Section */}
        {selectedModel ? (
          <section>
            <div className="flex justify-between items-center my-[10px] mx-[4px]">
              <span className="text-xs font-bold text-muted-foreground tracking-[0.01em]">
                {t("settings.model.selectedLabel", { defaultValue: "Selected Model" })}
              </span>
              <span className="text-xs text-muted-foreground font-bold">
                {t("settings.model.updatedAt", { defaultValue: "Updated" })} {timeAgo(selectedModel.modifiedAt, t)}
              </span>
            </div>

            <article className="relative overflow-hidden p-[15px] rounded-[18px] border border-accent/40 bg-gradient-to-br from-accent/10 to-transparent shadow-sm mb-3">
              <div className="absolute inset-0 bg-gradient-to-b from-panel/90 to-surface/90 pointer-events-none -z-10" />
              
              <div className="relative z-10">
                {/* Model Head */}
                <div className="flex items-start justify-between gap-3 mb-[12px]">
                  <div className="flex items-center gap-[10px] min-w-0">
                    <div className="size-[38px] shrink-0 grid place-items-center rounded-[13px] bg-white text-blue-500 font-black text-[24px] shadow-sm">
                      <Cpu className="size-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-[6px]">
                        <strong className="text-[15px] font-bold text-foreground truncate tracking-tight">
                          {selectedModel.fileName}
                        </strong>
                        {selectedModel.isDefault && (
                          <CheckCircle2 className="size-3.5 text-accent shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-[3px] leading-[1.45] truncate max-w-[280px]">
                        {selectedModel.path}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 px-[9px] py-[6px] rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[11px] font-bold whitespace-nowrap">
                    {t("settings.model.ready", { defaultValue: "Ready" })}
                  </span>
                </div>

                {/* Meta Grid */}
                <div className="grid grid-cols-3 gap-2 mb-[12px]">
                  <div className="p-[9px] rounded-[13px] bg-black/15 border border-white/5">
                    <b className="block mb-[3px] text-[10px] font-bold text-muted-foreground uppercase tracking-[0.04em]">Params</b>
                    <span className="text-xs font-bold text-foreground">Unknown</span>
                  </div>
                  <div className="p-[9px] rounded-[13px] bg-black/15 border border-white/5">
                    <b className="block mb-[3px] text-[10px] font-bold text-muted-foreground uppercase tracking-[0.04em]">Arch</b>
                    <span className="text-xs font-bold text-foreground">GGUF</span>
                  </div>
                  <div className="p-[9px] rounded-[13px] bg-black/15 border border-white/5">
                    <b className="block mb-[3px] text-[10px] font-bold text-muted-foreground uppercase tracking-[0.04em]">Format</b>
                    <span className="text-xs font-bold text-foreground">GGUF</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-[7px] mb-[13px]">
                  <span className="px-2 py-[5px] rounded-full border border-white/5 bg-white/5 text-yellow-500 text-[11px] font-bold flex items-center gap-1">
                    <Eye className="size-3" /> {t("settings.model.vision", { defaultValue: "Vision" })}
                  </span>
                  <span className="px-2 py-[5px] rounded-full border border-white/5 bg-white/5 text-blue-500 text-[11px] font-bold flex items-center gap-1">
                    <Hammer className="size-3" /> {t("settings.model.toolUse", { defaultValue: "Tool Use" })}
                  </span>
                  <span className="px-2 py-[5px] rounded-full border border-white/5 bg-white/5 text-green-500 text-[11px] font-bold flex items-center gap-1">
                    <Info className="size-3" /> {t("settings.model.reasoning", { defaultValue: "Reasoning" })}
                  </span>
                </div>

                {/* Download/Action Box */}
                <div className="p-[11px] rounded-[15px] bg-white/5 border border-white/10 mb-[13px]">
                  <div className="flex items-center justify-between gap-[10px] mb-[10px]">
                    <div className="flex items-center gap-[8px] min-w-0">
                      <span className="px-[7px] py-[5px] rounded-[8px] bg-accent/20 text-[#dcd7ff] text-[10px] font-extrabold shrink-0">
                        Q4_K_M
                      </span>
                      <span className="text-xs font-bold text-[#d5d7dd] truncate">
                        {selectedModel.fileName}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground shrink-0">
                      {formatBytes(selectedModel.sizeBytes)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_1.2fr] gap-[8px]">
                    <Button 
                      variant="outline" 
                      className="h-[38px] rounded-[12px] bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20 hover:text-green-500 text-xs font-bold"
                    >
                      {t("settings.model.gpuOk", { defaultValue: "GPU Offload OK" })}
                    </Button>
                    <Button 
                      className="h-[38px] rounded-[12px] bg-gradient-to-br from-accent to-[#685cff] text-white shadow-[0_10px_28px_rgba(104,92,255,0.25)] hover:shadow-[0_12px_32px_rgba(104,92,255,0.35)] transition-all text-xs font-bold"
                      onClick={() => onSelectModel(selectedModel.path, selectedModel.id)}
                      disabled={isBusy || selectedModel.isDefault}
                    >
                      {selectedModel.isDefault ? t("settings.model.inUse", { defaultValue: "현재 사용 중" }) : t("settings.model.useSelected", { defaultValue: "모델 적용하기" })}
                    </Button>
                  </div>
                </div>

                {/* Readme */}
                <div className="p-[14px] rounded-[16px] border border-white/5 bg-black/10">
                  <div className="mb-[8px] text-[12px] font-bold text-[#d7d9de] uppercase tracking-[0.04em]">
                    {t("settings.model.note", { defaultValue: "Model Note" })}
                  </div>
                  <p className="text-xs text-muted-foreground leading-[1.6] m-0">
                    {t("settings.model.descriptionBox", { defaultValue: "Gemma is a family of open models built for text and image input. Use this profile for lightweight local reasoning and draft inspection inside Luie." })}
                  </p>
                </div>
              </div>
            </article>
          </section>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-2xl mb-3">
            <Cpu className="size-8 mb-3 opacity-20" />
            <p className="text-sm">{t("settings.model.noModels", { defaultValue: "검색 결과가 없거나 로컬 모델이 존재하지 않습니다." })}</p>
            <Button 
              variant="outline" 
              className="mt-4 rounded-xl"
              onClick={onDownloadDefault}
              disabled={isBusy}
            >
              <Download className="size-4 mr-2" />
              {t("settings.model.downloadDefault", { defaultValue: "기본 모델 다운로드" })}
            </Button>
          </div>
        )}

        {/* Recommended / Other Models Section */}
        {otherModels.length > 0 && (
          <section>
            <div className="flex justify-between items-center my-[10px] mx-[4px]">
              <span className="text-xs font-bold text-muted-foreground tracking-[0.01em]">
                {t("settings.model.otherModels", { defaultValue: "Recommended" })}
              </span>
              <span className="text-xs text-muted-foreground font-bold">
                {otherModels.length} models
              </span>
            </div>

            <div className="flex flex-col gap-[9px]">
              {otherModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className="flex items-center justify-between p-[12px_13px] rounded-[16px] bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group"
                >
                  <div className="flex items-center gap-[10px] min-w-0">
                    <div className="size-[32px] shrink-0 grid place-items-center rounded-[11px] bg-white/10 text-[#dedfe4] font-black text-[15px] transition-colors">
                      <Cpu className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-[#dedfe4] truncate">{model.fileName}</div>
                      <div className="text-[11px] text-muted-foreground truncate mt-[2px]">
                        {formatBytes(model.sizeBytes)} · GGUF
                      </div>
                    </div>
                  </div>
                  <div className="size-[30px] rounded-[10px] border border-white/5 bg-white/5 text-muted-foreground grid place-items-center group-hover:bg-accent group-hover:text-white transition-colors">
                    <ArrowDownToLine className="size-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Global Settings (HF Token & Repo Dir) appended at the bottom seamlessly */}
      <section className="pt-[18px] mt-[14px] border-t border-border/50">
        <div className="text-xs font-bold text-muted-foreground tracking-[0.01em] mb-[10px] mx-[4px]">
          {t("settings.model.advanced", { defaultValue: "Advanced Configuration" })}
        </div>
        
        <div className="flex flex-col gap-[9px]">
          {/* Repo Dir */}
          <div className="flex items-center justify-between p-[12px_13px] rounded-[16px] bg-white/5 border border-white/5">
            <div className="flex items-center gap-[10px] min-w-0">
              <div className="size-[32px] rounded-[11px] bg-white/10 grid place-items-center shrink-0">
                <Folder className="size-[15px] text-[#dedfe4]" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#dedfe4] truncate">{t("settings.model.repoLocation", { defaultValue: "저장소 위치" })}</div>
                <div className="text-[11px] text-muted-foreground truncate mt-[2px]">{modelView.modelsDir || "-"}</div>
              </div>
            </div>
            <Button variant="ghost" size="xs" onClick={onRefresh} disabled={isBusy} className="h-[30px] px-3 text-[11px] font-bold rounded-[10px] border border-white/5 bg-white/5 hover:bg-white/10 shrink-0">
              <RefreshCw className="size-3 mr-1.5" /> {t("settings.model.refresh", { defaultValue: "새로고침" })}
            </Button>
          </div>

          {/* HF Token */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-[12px_13px] rounded-[16px] bg-white/5 border border-white/5 gap-3">
            <div className="flex items-center gap-[10px] shrink-0">
              <div className="size-[32px] rounded-[11px] bg-white/10 grid place-items-center shrink-0">
                <Key className="size-[15px] text-[#dedfe4]" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#dedfe4]">{t("settings.model.hfToken", { defaultValue: "Hugging Face 토큰" })}</div>
                <div className="mt-[2px]">
                  {modelView.hasHuggingFaceToken ? (
                    <span className="text-[11px] font-bold text-green-500 flex items-center gap-1">
                      <Check className="size-3" /> {t("settings.model.saved", { defaultValue: "저장됨" })}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                      <AlertCircle className="size-3" /> {t("settings.model.notSet", { defaultValue: "미설정" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
              <Input 
                type="password"
                value={hfToken}
                onChange={(e) => onChangeHfToken(e.target.value)}
                placeholder="hf_..."
                className="h-[34px] text-xs flex-1 rounded-[10px] bg-black/40 border-white/5 focus-visible:ring-accent/20"
              />
              <Button variant="secondary" size="sm" onClick={onSaveHfToken} disabled={isBusy || !hfToken} className="h-[34px] text-[11px] font-bold rounded-[10px] shrink-0 border border-white/5 bg-white/5 hover:bg-white/10">
                {t("settings.model.save", { defaultValue: "저장" })}
              </Button>
            </div>
          </div>

          {/* Manual Path */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-[12px_13px] rounded-[16px] bg-white/5 border border-white/5 gap-3">
            <div className="flex items-center gap-[10px] shrink-0">
              <div className="size-[32px] rounded-[11px] bg-white/10 grid place-items-center shrink-0">
                <HardDrive className="size-[15px] text-[#dedfe4]" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-[#dedfe4]">{t("settings.model.manualConnect", { defaultValue: "수동 모델 연결" })}</div>
                <div className="text-[11px] text-muted-foreground mt-[2px]">{t("settings.model.manualConnectDesc", { defaultValue: "외부 모델 직접 연결" })}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
              <Input 
                value={manualModelPath}
                onChange={(e) => onChangeManualPath(e.target.value)}
                placeholder={t("settings.model.manualConnectPlaceholder", { defaultValue: "모델의 절대 경로 입력..." })}
                className="h-[34px] text-xs flex-1 rounded-[10px] bg-black/40 border-white/5 focus-visible:ring-accent/20"
              />
              <Button variant="secondary" size="sm" onClick={onSaveManualPath} disabled={isBusy || !manualModelPath} className="h-[34px] text-[11px] font-bold rounded-[10px] shrink-0 border border-white/5 bg-white/5 hover:bg-white/10">
                {t("settings.model.save", { defaultValue: "저장" })}
              </Button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}

