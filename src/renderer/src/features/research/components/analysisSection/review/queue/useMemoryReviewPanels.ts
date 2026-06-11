import type { MemoryScope } from "../../shared/types";
import { useMemoryReviewQueues } from "./useMemoryReviewQueues";

type UseMemoryReviewPanelsInput = {
  projectId?: string;
  chapterId?: string;
  memoryScope: MemoryScope;
};

export function useMemoryReviewPanels({
  projectId,
  chapterId,
  memoryScope,
}: UseMemoryReviewPanelsInput) {
  const queues = useMemoryReviewQueues({ projectId, chapterId, memoryScope });

  return {
    ...queues,
  };
}
