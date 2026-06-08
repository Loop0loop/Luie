import { useCallback, useState } from "react";
import { api } from "@shared/api";
import { useDialog } from "@shared/ui/useDialog";
import { useToast } from "@shared/ui/ToastContext";
import type {
  AnalysisConflictItem,
  AnalysisEntityAliasReviewItem,
  AnalysisEntityReviewItem,
  AnalysisEpisodeReviewItem,
  AnalysisFactReviewItem,
} from "./types";
import type { useMemoryReviewQueues } from "./useMemoryReviewQueues";

type ReviewQueueState = ReturnType<typeof useMemoryReviewQueues>;

type UseMemoryReviewMutationsInput = {
  projectId?: string;
  queues: Pick<
    ReviewQueueState,
    | "setConflictItems"
    | "setEpisodeReviewItems"
    | "setFactReviewItems"
    | "setEntityReviewItems"
    | "setEntityAliasReviewItems"
  >;
};

export function useMemoryReviewMutations({
  projectId,
  queues,
}: UseMemoryReviewMutationsInput) {
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(
    null,
  );
  const [rejectingEpisodeId, setRejectingEpisodeId] = useState<string | null>(
    null,
  );
  const [mutatingFactId, setMutatingFactId] = useState<string | null>(null);
  const [mutatingEntityId, setMutatingEntityId] = useState<string | null>(null);
  const [mutatingAliasId, setMutatingAliasId] = useState<string | null>(null);
  const { showToast } = useToast();
  const dialog = useDialog();

  const handleResolveConflict = useCallback(
    async (item: AnalysisConflictItem, winnerFactId: string) => {
      if (!projectId) return;
      const confirmed = await dialog.confirm({
        title: "충돌 해결",
        message: "선택한 사실을 확정하고 반대 사실을 거절 처리합니다.",
      });
      if (!confirmed) return;

      setResolvingConflictId(item.conflictId);
      try {
        const response = await api.memory.resolveFactConflict({
          projectId,
          conflictId: item.conflictId,
          winnerFactId,
          reason: "사용자 충돌 해결",
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "충돌 해결 실패", "error");
          return;
        }
        queues.setConflictItems((prev) =>
          prev.filter((conflict) => conflict.conflictId !== item.conflictId),
        );
        showToast("충돌을 해결했습니다.", "info");
      } finally {
        setResolvingConflictId(null);
      }
    },
    [projectId, dialog, queues, showToast],
  );

  const handleRejectEpisode = useCallback(
    async (item: AnalysisEpisodeReviewItem) => {
      if (!projectId) return;
      const reason = await dialog.prompt({
        title: "거절 사유",
        defaultValue: "근거 부족",
        placeholder: "거절 사유",
      });
      if (!reason?.trim()) return;

      setRejectingEpisodeId(item.id);
      try {
        const response = await api.memory.rejectEpisode({
          projectId,
          episodeId: item.id,
          reason: reason.trim(),
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "에피소드 거절 실패", "error");
          return;
        }
        queues.setEpisodeReviewItems((prev) =>
          prev.filter((episode) => episode.id !== item.id),
        );
        showToast("에피소드 후보를 거절했습니다.", "info");
      } finally {
        setRejectingEpisodeId(null);
      }
    },
    [projectId, dialog, queues, showToast],
  );

  const handleConfirmFact = useCallback(
    async (item: AnalysisFactReviewItem) => {
      if (!projectId) return;
      setMutatingFactId(item.id);
      try {
        const response = await api.memory.confirmFact({
          projectId,
          factId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "사실 확정 실패", "error");
          return;
        }
        queues.setFactReviewItems((prev) =>
          prev.filter((fact) => fact.id !== item.id),
        );
        showToast("사실 후보를 canonical memory로 승인했습니다.", "info");
      } finally {
        setMutatingFactId(null);
      }
    },
    [projectId, queues, showToast],
  );

  const handleRejectFact = useCallback(
    async (item: AnalysisFactReviewItem) => {
      if (!projectId) return;
      const reason = await dialog.prompt({
        title: "거절 사유",
        defaultValue: "근거 부족",
        placeholder: "거절 사유",
      });
      if (!reason?.trim()) return;

      setMutatingFactId(item.id);
      try {
        const response = await api.memory.rejectFact({
          projectId,
          factId: item.id,
          reason: reason.trim(),
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "사실 거절 실패", "error");
          return;
        }
        queues.setFactReviewItems((prev) =>
          prev.filter((fact) => fact.id !== item.id),
        );
        showToast("사실 후보를 거절했습니다.", "info");
      } finally {
        setMutatingFactId(null);
      }
    },
    [projectId, dialog, queues, showToast],
  );

  const handleConfirmEntity = useCallback(
    async (item: AnalysisEntityReviewItem) => {
      if (!projectId) return;
      setMutatingEntityId(item.id);
      try {
        const response = await api.memory.confirmEntity({
          projectId,
          entityId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "엔티티 확정 실패", "error");
          return;
        }
        queues.setEntityReviewItems((prev) =>
          prev.filter((entity) => entity.id !== item.id),
        );
        showToast("엔티티 후보를 canonical memory로 승인했습니다.", "info");
      } finally {
        setMutatingEntityId(null);
      }
    },
    [projectId, queues, showToast],
  );

  const handleRejectEntity = useCallback(
    async (item: AnalysisEntityReviewItem) => {
      if (!projectId) return;
      const confirmed = await dialog.confirm({
        title: "엔티티 거절",
        message: `${item.canonicalName} 후보를 거절합니다.`,
      });
      if (!confirmed) return;

      setMutatingEntityId(item.id);
      try {
        const response = await api.memory.rejectEntity({
          projectId,
          entityId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "엔티티 거절 실패", "error");
          return;
        }
        queues.setEntityReviewItems((prev) =>
          prev.filter((entity) => entity.id !== item.id),
        );
        showToast("엔티티 후보를 거절했습니다.", "info");
      } finally {
        setMutatingEntityId(null);
      }
    },
    [projectId, dialog, queues, showToast],
  );

  const handleConfirmEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem) => {
      if (!projectId) return;
      setMutatingAliasId(item.id);
      try {
        const response = await api.memory.confirmEntityAlias({
          projectId,
          aliasId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "별칭 확정 실패", "error");
          return;
        }
        queues.setEntityAliasReviewItems((prev) =>
          prev.filter((alias) => alias.id !== item.id),
        );
        showToast("별칭 후보를 확정했습니다.", "info");
      } finally {
        setMutatingAliasId(null);
      }
    },
    [projectId, queues, showToast],
  );

  const handleRejectEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem) => {
      if (!projectId) return;
      const confirmed = await dialog.confirm({
        title: "별칭 거절",
        message: `${item.canonicalName} = ${item.alias} 후보를 거절합니다.`,
      });
      if (!confirmed) return;

      setMutatingAliasId(item.id);
      try {
        const response = await api.memory.rejectEntityAlias({
          projectId,
          aliasId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "별칭 거절 실패", "error");
          return;
        }
        queues.setEntityAliasReviewItems((prev) =>
          prev.filter((alias) => alias.id !== item.id),
        );
        showToast("별칭 후보를 거절했습니다.", "info");
      } finally {
        setMutatingAliasId(null);
      }
    },
    [projectId, dialog, queues, showToast],
  );

  const handleMergeEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem, targetEntityId: string) => {
      if (!projectId || !targetEntityId) return;
      const confirmed = await dialog.confirm({
        title: "엔티티 통합",
        message: `${item.canonicalName} 후보를 선택한 targetEntityId로 통합합니다.`,
      });
      if (!confirmed) return;

      setMutatingAliasId(item.id);
      try {
        const response = await api.memory.mergeEntity({
          projectId,
          targetEntityId,
          sourceEntityId: item.entityId,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "엔티티 통합 실패", "error");
          return;
        }
        queues.setEntityAliasReviewItems((prev) =>
          prev.filter((alias) => alias.id !== item.id),
        );
        showToast("엔티티를 통합했습니다.", "info");
      } finally {
        setMutatingAliasId(null);
      }
    },
    [projectId, dialog, queues, showToast],
  );

  const handleSplitEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem, canonicalName: string) => {
      if (!projectId || !canonicalName) return;
      const confirmed = await dialog.confirm({
        title: "엔티티 분리",
        message: `${item.alias} 후보를 새 canonical entity로 분리합니다.`,
      });
      if (!confirmed) return;

      setMutatingAliasId(item.id);
      try {
        const response = await api.memory.splitEntityAlias({
          projectId,
          aliasId: item.id,
          canonicalName,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "엔티티 분리 실패", "error");
          return;
        }
        queues.setEntityAliasReviewItems((prev) =>
          prev.filter((alias) => alias.id !== item.id),
        );
        showToast("엔티티를 분리했습니다.", "info");
      } finally {
        setMutatingAliasId(null);
      }
    },
    [projectId, dialog, queues, showToast],
  );

  return {
    resolvingConflictId,
    rejectingEpisodeId,
    mutatingFactId,
    mutatingEntityId,
    mutatingAliasId,
    handleResolveConflict,
    handleRejectEpisode,
    handleConfirmFact,
    handleRejectFact,
    handleConfirmEntity,
    handleRejectEntity,
    handleConfirmEntityAlias,
    handleRejectEntityAlias,
    handleMergeEntityAlias,
    handleSplitEntityAlias,
  };
}
