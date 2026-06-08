import type { MemoryScope } from "./types";
import { useMemoryReviewMutations } from "./useMemoryReviewMutations";
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
  const mutations = useMemoryReviewMutations({ projectId, queues });

  return {
    ...queues,
    ...mutations,
  };
}
