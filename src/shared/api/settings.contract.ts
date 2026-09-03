import type { IPCResponse } from "@shared/ipc/index.js";
import type * as SharedTypes from "@shared/types/index.js";

export type SettingsRendererApi = {
  settings: {
    getAll: () => Promise<IPCResponse<SharedTypes.AppSettings>>;
    getEditor: () => Promise<IPCResponse<SharedTypes.EditorSettings>>;
    setEditor: (
      settings: SharedTypes.EditorSettings,
    ) => Promise<IPCResponse<SharedTypes.EditorSettings>>;
    getAutoSave: () => Promise<
      IPCResponse<{ enabled: boolean; interval: number }>
    >;
    setAutoSave: (settings: {
      enabled?: boolean;
      interval?: number;
    }) => Promise<IPCResponse<{ enabled: boolean; interval: number }>>;
    getLanguage: () => Promise<IPCResponse<{ language: "ko" | "en" | "ja" }>>;
    setLanguage: (settings: {
      language: "ko" | "en" | "ja";
    }) => Promise<IPCResponse<{ language: "ko" | "en" | "ja" }>>;
    getMenuBarMode: () => Promise<IPCResponse<{ mode: SharedTypes.WindowMenuBarMode }>>;
    setMenuBarMode: (settings: {
      mode: SharedTypes.WindowMenuBarMode;
    }) => Promise<IPCResponse<{ mode: SharedTypes.WindowMenuBarMode }>>;
    getSearchOptimizationMode: () => Promise<
      IPCResponse<{ mode: SharedTypes.RagSearchOptimizationMode }>
    >;
    setSearchOptimizationMode: (settings: {
      mode: SharedTypes.RagSearchOptimizationMode;
    }) => Promise<IPCResponse<{ mode: SharedTypes.RagSearchOptimizationMode }>>;
    getShortcuts: () => Promise<
      IPCResponse<{
        shortcuts: Record<string, string>;
        defaults: Record<string, string>;
      }>
    >;
    setShortcuts: (settings: { shortcuts: Record<string, string> }) => Promise<
      IPCResponse<{
        shortcuts: Record<string, string>;
        defaults: Record<string, string>;
      }>
    >;
    getWindowBounds: () => Promise<
      IPCResponse<
        { width: number; height: number; x: number; y: number } | undefined
      >
    >;
    setWindowBounds: (bounds: {
      width: number;
      height: number;
      x: number;
      y: number;
    }) => Promise<
      IPCResponse<{ width: number; height: number; x: number; y: number }>
    >;
    setOllamaConfig: (input: {
      baseUrl: string;
      chatModel: string;
      embeddingModel?: string;
      apiKey?: string;
    }) => Promise<IPCResponse<{ ok: boolean }>>;
    setLlmPreference: (input: {
      provider: "auto" | "sidecar" | "ollama" | "openai" | "gemini";
    }) => Promise<IPCResponse<{ ok: boolean }>>;
    setLlmKeys: (input: {
      openaiApiKey: string;
      geminiApiKey: string;
    }) => Promise<IPCResponse<{ ok: boolean }>>;
    getLlmRuntime: () => Promise<IPCResponse<SharedTypes.LlmRuntimeInfo>>;
    listOllamaModels: (baseUrl: string) => Promise<IPCResponse<string[]>>;
    testOllamaConnection: (baseUrl: string) => Promise<IPCResponse<SharedTypes.OllamaConnectionResult>>;
    getLocalLlmSettings: () => Promise<IPCResponse<{
      enabled?: boolean;
      modelPath?: string;
      binaryPath?: string;
      gpuLayers?: number;
      contextSize?: number;
      cacheRamMiB?: number;
      cacheReuse?: number;
      sidecarRunning: boolean;
      sidecarBaseUrl: string | null;
    }>>;
    setLocalLlmSettings: (input: {
      enabled: boolean;
      modelPath?: string;
      binaryPath?: string;
      gpuLayers?: number;
      contextSize?: number;
      cacheRamMiB?: number;
      cacheReuse?: number;
    }) => Promise<IPCResponse<{ ok: boolean }>>;
    getSidecarStatus: () => Promise<IPCResponse<SharedTypes.UtilitySidecarStatus>>;
    onSidecarStatusChanged: (
      callback: (event: SharedTypes.UtilitySidecarStatusEvent) => void,
    ) => () => void;
    stopSidecar: () => Promise<IPCResponse<{ ok: boolean }>>;
    startModelDownload: (input: {
      type: "model" | "binary";
      repo?: string;
      filename?: string;
    }) => Promise<IPCResponse<{ ok: boolean }>>;
    cancelModelDownload: () => Promise<IPCResponse<{ ok: boolean }>>;
    searchHfModels: (query: string) => Promise<IPCResponse<SharedTypes.HfModelSearchResult[]>>;
    getHfModelFiles: (repoId: string) => Promise<IPCResponse<SharedTypes.HfModelFile[]>>;
    getLlmfitRecommendations: (options?: {
      limit?: number;
      useCase?: "general" | "coding" | "reasoning" | "chat" | "multimodal" | "embedding";
      minFit?: "perfect" | "good" | "marginal" | "too_tight";
    }) => Promise<IPCResponse<SharedTypes.LlmfitResult>>;
    installLlmfit: () => Promise<IPCResponse<SharedTypes.LlmfitInstallStatus>>;
    getLlmfitStatus: () => Promise<IPCResponse<SharedTypes.LlmfitInstallStatus>>;
    onModelDownloadProgress: (callback: (progress: {
      stage: "binary" | "model" | "complete" | "error";
      pct: number;
      error?: string;
    }) => void) => () => void;
    getEmbeddingModelStatus: () => Promise<IPCResponse<SharedTypes.EmbeddingModelStatusView>>;
    downloadEmbeddingModel: () => Promise<IPCResponse<{ ok: boolean }>>;
    onEmbeddingModelDownloadProgress: (callback: (progress: {
      stage: "downloading" | "complete" | "error";
      pct: number;
      error?: string;
    }) => void) => () => void;
    reset: () => Promise<IPCResponse<SharedTypes.AppSettings>>;
  };
  recovery: {
    getStatus: () => Promise<IPCResponse<SharedTypes.DbRecoveryStatus>>;
    runDb: (options?: {
      dryRun?: boolean;
    }) => Promise<IPCResponse<SharedTypes.DbRecoveryResult>>;
  };
  sync: {
    getStatus: () => Promise<IPCResponse<SharedTypes.SyncStatus>>;
    connectGoogle: () => Promise<IPCResponse<SharedTypes.SyncStatus>>;
    disconnect: () => Promise<IPCResponse<SharedTypes.SyncStatus>>;
    runNow: () => Promise<IPCResponse<SharedTypes.SyncRunResult>>;
    setAutoSync: (settings: {
      enabled: boolean;
    }) => Promise<IPCResponse<SharedTypes.SyncStatus>>;
    getRuntimeConfig: () => Promise<IPCResponse<SharedTypes.RuntimeSupabaseConfigView>>;
    setRuntimeConfig: (
      settings: SharedTypes.RuntimeSupabaseConfig,
    ) => Promise<IPCResponse<SharedTypes.RuntimeSupabaseConfigView>>;
    validateRuntimeConfig: (settings: SharedTypes.RuntimeSupabaseConfig) => Promise<
      IPCResponse<{
        valid: boolean;
        issues: string[];
        normalized?: SharedTypes.RuntimeSupabaseConfig;
      }>
    >;
    onStatusChanged: (callback: (status: SharedTypes.SyncStatus) => void) => () => void;
    onAuthResult: (callback: (result: SharedTypes.SyncAuthResult) => void) => () => void;
    resolveConflict: (resolution: {
      type: "chapter" | "memo" | "memoryCanonical";
      id: string;
      resolution: "local" | "remote";
    }) => Promise<IPCResponse<void>>;
  };
  startup: {
    getReadiness: () => Promise<IPCResponse<SharedTypes.StartupReadiness>>;
    completeWizard: () => Promise<IPCResponse<SharedTypes.StartupReadiness>>;
  };
  app: {
    getVersion: () => Promise<IPCResponse<{ version: string }>>;
    checkUpdate: () => Promise<IPCResponse<SharedTypes.AppUpdateCheckResult>>;
    getUpdateState: () => Promise<IPCResponse<SharedTypes.AppUpdateState>>;
    downloadUpdate: () => Promise<IPCResponse<SharedTypes.AppUpdateDownloadResult>>;
    applyUpdate: () => Promise<IPCResponse<SharedTypes.AppUpdateApplyResult>>;
    rollbackUpdate: () => Promise<IPCResponse<SharedTypes.AppUpdateRollbackResult>>;
    getBootstrapStatus: () => Promise<IPCResponse<SharedTypes.AppBootstrapStatus>>;
    onBootstrapStatus: (
      callback: (status: SharedTypes.AppBootstrapStatus) => void,
    ) => () => void;
    onUpdateState: (callback: (status: SharedTypes.AppUpdateState) => void) => () => void;
    quit: () => Promise<IPCResponse<unknown>>;
    relaunch: () => Promise<IPCResponse<unknown>>;
    manualSave: (
      projectId: string,
    ) => Promise<IPCResponse<{ success: boolean; exported: boolean }>>;
  };
  window: {
    minimize: () => Promise<IPCResponse<unknown>>;
    maximize: () => Promise<IPCResponse<unknown>>;
    unmaximize: () => Promise<IPCResponse<unknown>>;
    close: () => Promise<IPCResponse<unknown>>;
    toggleFullscreen: () => Promise<IPCResponse<unknown>>;
    setFullscreen: (flag: boolean) => Promise<IPCResponse<unknown>>;
    /** 메인 창 최대화 상태 변경 이벤트. Windows 인앱 창 버튼의 아이콘 전환에 쓴다. */
    onMaximizeChanged: (callback: (maximized: boolean) => void) => () => void;
    /** macOS 전용. 다른 플랫폼에서는 no-op으로 응답한다. */
    setTrafficLightVisibility: (
      visible: boolean,
    ) => Promise<IPCResponse<unknown>>;
    openExport: (chapterId: string) => Promise<IPCResponse<boolean>>;

    openWorldGraph: () => Promise<IPCResponse<unknown>>;
    /** 시작 위저드 창의 크기를 단계 전환에 맞춰 바꾼다. 위저드 창이 없으면 no-op한다.
        animate는 renderer의 enableAnimations(및 OS reduced-motion) 판정을 전달한다. */
    setStartupWizardSize: (
      width: number,
      height: number,
      animate: boolean,
    ) => Promise<IPCResponse<unknown>>;
  };
  logger: {
    debug: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
    info: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
    warn: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
    error: (message: string, data?: unknown) => Promise<IPCResponse<unknown>>;
  };
  analysis: {
    start: (
      chapterId: string,
      projectId: string,
    ) => Promise<IPCResponse<unknown>>;
    stop: () => Promise<IPCResponse<unknown>>;
    clear: () => Promise<IPCResponse<unknown>>;
    onStream: (callback: (data: unknown) => void) => () => void;
    onError: (callback: (error: unknown) => void) => () => void;
  };
};
