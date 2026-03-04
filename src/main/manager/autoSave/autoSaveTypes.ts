export interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  debounceMs: number;
}

export interface PendingSave {
  chapterId: string;
  content: string;
  projectId: string;
}
