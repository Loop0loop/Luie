export interface AnalysisRequest {
  chapterId: string;
  projectId: string;
}

export interface AnalysisItem {
  id: string;
  type: "reaction" | "suggestion" | "intro" | "outro";
  content: string;
  contextId?: string;
  quote?: string;
}

export interface AnalysisContext {
  characters: Array<{
    name: string;
    description: string;
  }>;
  terms: Array<{
    term: string;
    definition: string;
    category: string;
  }>;
  manuscript: {
    title: string;
    content: string;
    nounPhrases: string[];
  };
}

export interface AnalysisStreamChunk {
  item: AnalysisItem;
  done: boolean;
}

export interface AnalysisResult {
  items: AnalysisItem[];
  metadata: {
    chapterId: string;
    projectId: string;
    analyzedAt: Date;
    totalItems: number;
  };
}

export interface AnalysisError {
  code: "API_KEY_MISSING" | "NETWORK_ERROR" | "QUOTA_EXCEEDED" | "INVALID_REQUEST" | "UNKNOWN";
  message: string;
  details?: string;
}
