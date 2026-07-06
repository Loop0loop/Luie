import { createAnalysisRunActions } from "./actions/analysisRunActions";
import { createRagChatActions } from "./actions/ragChatActions";
import { createSummaryStatusActions } from "./actions/summaryStatusActions";
import type {
  AnalysisActions,
  AnalysisGet,
  AnalysisSet,
} from "./analysisStore.types";

export type { AnalysisActions } from "./analysisStore.types";
export { cleanUpRagStreamListeners } from "./actions/ragChatActions";

export function createAnalysisActions(
  set: AnalysisSet,
  get: AnalysisGet,
): AnalysisActions {
  return {
    ...createAnalysisRunActions(set),
    ...createRagChatActions(set, get),
    ...createSummaryStatusActions(set),
  };
}
