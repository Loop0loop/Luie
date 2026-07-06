import type { AnalysisStreamChunk } from "@shared/types/analysis.js";
import type {
  MemoryScope,
  Message,
} from "../../components/analysisSection/shared/types";

export interface AnalysisActions {
  startAnalysis: (chapterId: string, projectId: string) => Promise<void>;
  stopAnalysis: () => Promise<void>;
  clearAnalysis: () => Promise<void>;
  addStreamItem: (chunk: AnalysisStreamChunk) => void;

  handleSend: (
    projectId: string,
    chapterId: string | undefined,
    memoryScope: MemoryScope,
  ) => Promise<void>;
  handleStop: () => Promise<void>;
  loadNarrativeSummaryStatus: (projectId: string) => Promise<void>;
}

export type AnalysisActionState = {
  items: Array<NonNullable<AnalysisStreamChunk["item"]>>;
  messages: Message[];
  input: string;
  isStreaming: boolean;
  ragRunId: string | null;
};

export type AnalysisSet = (
  partial:
    | Record<string, unknown>
    | ((state: AnalysisActionState) => Record<string, unknown>),
) => void;

export type AnalysisGet = () => AnalysisActionState;
