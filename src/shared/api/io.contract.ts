import type { IPCResponse } from "@shared/ipc/index.js";
import type * as SharedTypes from "@shared/types/index.js";

export type IoRendererApi = {
  export: {
    create: (request: {
      projectId: string;
      chapterId: string;
      title: string;
      content: string;
      format: "DOCX" | "HWPX";
      paperSize: "A4" | "Letter" | "B5";
      marginTop: number;
      marginBottom: number;
      marginLeft: number;
      marginRight: number;
      fontFamily: string;
      fontSize: number;
      lineHeight: string;
      normalizeLineSpacing?: boolean;
      showPageNumbers: boolean;
      startPageNumber: number;
    }) => Promise<
      IPCResponse<{
        success: boolean;
        filePath?: string;
        error?: string;
        message?: string;
      }>
    >;
  };
  fs: {
    saveProject: (
      projectName: string,
      projectPath: string,
      content: string,
    ) => Promise<IPCResponse<unknown>>;
    selectDirectory: () => Promise<IPCResponse<string>>;
    selectFile: (options?: {
      filters?: { name: string; extensions: string[] }[];
      defaultPath?: string;
      title?: string;
    }) => Promise<IPCResponse<string>>;
    selectSnapshotBackup: () => Promise<IPCResponse<string>>;
    selectSaveLocation: (options?: {
      filters?: { name: string; extensions: string[] }[];
      defaultPath?: string;
      title?: string;
    }) => Promise<IPCResponse<string>>;
    readFile: (filePath: string) => Promise<IPCResponse<string>>;
    readLuieEntry: (
      packagePath: string,
      entryPath: string,
    ) => Promise<IPCResponse<string | null>>;
    writeFile: (
      filePath: string,
      content: string,
    ) => Promise<IPCResponse<unknown>>;
    createLuiePackage: (
      packagePath: string,
      meta: unknown,
    ) => Promise<IPCResponse<{ path: string }>>;
    writeProjectFile: (
      projectRoot: string,
      relativePath: string,
      content: string,
    ) => Promise<IPCResponse<{ path: string }>>;
    approveProjectPath: (
      projectPath: string,
    ) => Promise<IPCResponse<{ approved: boolean; normalizedPath: string }>>;
  };
  search: (query: {
    projectId: string;
    query: string;
    type?: "all" | "character" | "term";
  }) => Promise<IPCResponse<SharedTypes.SearchResult[]>>;
  searchAdmin: {
    getIndexStatus: (
      projectId: string,
    ) => Promise<IPCResponse<SharedTypes.SearchIndexStatus>>;
    rebuildIndex: (
      projectId: string,
    ) => Promise<IPCResponse<{ success: boolean }>>;
  };
  memoryAdmin: {
    rebuildChunks: (input: {
      projectId: string;
      sourceType?: string;
      sourceId?: string;
    }) => Promise<IPCResponse<{ queued: number; processed: number }>>;
    getJobStatus: (
      projectId: string,
    ) => Promise<IPCResponse<SharedTypes.MemoryJobStatus>>;
    getSummaryStatus: (
      projectId: string,
    ) => Promise<IPCResponse<SharedTypes.ChapterSummaryStatus>>;
    getEmbeddingStatus: (
      projectId: string,
    ) => Promise<IPCResponse<SharedTypes.MemoryEmbeddingStatus>>;
    pauseBuildJobs: (
      projectId: string,
    ) => Promise<IPCResponse<{ paused: number }>>;
    resumeBuildJobs: (
      projectId: string,
    ) => Promise<IPCResponse<{ resumed: number }>>;
    cancelBuildJobs: (
      projectId: string,
    ) => Promise<IPCResponse<{ canceled: number; cancellationRequested: number }>>;
    getBuildJobProgress: (
      projectId: string,
    ) => Promise<IPCResponse<SharedTypes.MemoryBuildJobProgress>>;
    runEvalSuite: (
      input: SharedTypes.MemoryEvalRunRequest,
    ) => Promise<IPCResponse<SharedTypes.MemoryEvalLiveRunnerResult>>;
    recordEvalFeedback: (
      input: SharedTypes.MemoryEvalFeedbackRecordRequest,
    ) => Promise<IPCResponse<SharedTypes.MemoryEvalFeedbackRecordResult>>;
    runIntentCalibration: (
      input: SharedTypes.NarrativeMemoryIntentCalibrationRequest,
    ) => Promise<IPCResponse<SharedTypes.NarrativeMemoryIntentCalibrationResult>>;
    runEpisodeCalibration: (
      input: SharedTypes.MemoryEpisodeCalibrationRequest,
    ) => Promise<IPCResponse<SharedTypes.MemoryEpisodeCalibrationResult>>;
  };
  memory: {
    queryNarrative: (
      input: SharedTypes.NarrativeMemoryQueryInput,
    ) => Promise<IPCResponse<SharedTypes.NarrativeMemoryQueryResult>>;
    searchChunks: (
      input: SharedTypes.MemoryChunkSearchQuery,
    ) => Promise<IPCResponse<SharedTypes.MemoryChunkSearchResult[]>>;
    getChunkBacklink: (
      chunkId: string,
    ) => Promise<IPCResponse<SharedTypes.MemoryChunkBacklink>>;
    getChunkWindow: (
      input: SharedTypes.MemoryChunkWindowQuery,
    ) => Promise<IPCResponse<SharedTypes.MemoryChunkWindowResult>>;
    getChapterSummary: (
      chapterId: string,
    ) => Promise<IPCResponse<SharedTypes.ChapterSummaryResult | null>>;
    getNarrativeSummaryStatus: (
      projectId: string,
    ) => Promise<IPCResponse<SharedTypes.NarrativeSummaryStatus>>;
  };
  maintenance: {
    runIntegrityCheck: () => Promise<
      IPCResponse<{ ok: boolean; rows: string[] }>
    >;
    getMigrationHealth: () => Promise<IPCResponse<SharedTypes.MigrationHealth>>;
  };
  rag: {
    ask: (
      input: SharedTypes.RagQaRequest,
    ) => Promise<IPCResponse<SharedTypes.RagQaRunHandle>>;
    stop: (runId?: string) => Promise<IPCResponse<{ stopped: boolean }>>;
    onStream: (
      callback: (payload: SharedTypes.RagQaStreamPayload) => void,
      runId?: string,
    ) => () => void;
    onError: (
      callback: (payload: SharedTypes.RagQaErrorPayload) => void,
      runId?: string,
    ) => () => void;
  };
  autoSave: (
    chapterId: string,
    content: string,
    projectId: string,
  ) => Promise<IPCResponse<unknown>>;
  lifecycle: {
    setDirty: (dirty: boolean) => void;
    onBeforeQuit: (callback: () => void) => () => void;
    completeFlush: () => Promise<void>;
    onQuitPhase: (
      callback: (payload: SharedTypes.AppQuitPhasePayload) => void,
    ) => () => void;
  };
};
