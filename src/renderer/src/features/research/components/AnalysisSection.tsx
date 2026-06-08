import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Send, Square } from "lucide-react";
import { useToast } from "@shared/ui/ToastContext";
import { useDialog } from "@shared/ui/useDialog";
import { api } from "@shared/api";
import { ErrorCode } from "@shared/constants/errorCode";
import { requestChapterNavigation } from "@renderer/features/workspace/services/chapterNavigation";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { Button } from "@renderer/components/ui/button";
import {
  type AnalysisConflictItem,
  type AnalysisEntityAliasReviewItem,
  type AnalysisEntityReviewItem,
  type AnalysisEpisodeReviewItem,
  type AnalysisEpisodeCalibrationReport,
  type AnalysisFactReviewItem,
  type AnalysisIntentCalibrationReport,
  type AnalysisMemoryEvalReport,
  type AnalysisNarrativeSummaryStatus,
  type AnalysisRagErrorPayload,
  type AnalysisRagStreamPayload,
  type AnalysisRuntimeInfo,
  type AnalysisSidecarStatus,
  type Message,
  type MemoryScope,
  type RuntimePreference,
} from "./analysisSection/types";
import { ConflictQueuePanel } from "./analysisSection/ConflictQueuePanel";
import { EntityAliasReviewPanel } from "./analysisSection/EntityAliasReviewPanel";
import { EntityReviewPanel } from "./analysisSection/EntityReviewPanel";
import { EpisodeReviewPanel } from "./analysisSection/EpisodeReviewPanel";
import { FactReviewPanel } from "./analysisSection/FactReviewPanel";
import { MessageList } from "./analysisSection/MessageList";
import { MemoryEvalReportPanel } from "./analysisSection/MemoryEvalReportPanel";
import { NarrativeSummaryStatusPanel } from "./analysisSection/NarrativeSummaryStatusPanel";
import { RuntimeStatusPanel } from "./analysisSection/RuntimeStatusPanel";

type ChatChunkItem = {
  chunkId: string;
  chapterId: string | null;
  quote: string;
};

const formatConflictFact = (fact: AnalysisConflictItem["invalidatedFact"]) => {
  const subject = fact.subjectEntityName ?? fact.subjectEntityId;
  const object =
    fact.objectEntityName ?? fact.objectValue ?? fact.objectEntityId ?? fact.subjectEntityId;
  return `${subject} → ${fact.predicate} → ${object} (${fact.status})`;
};

const renderErrorMessage = (payload: AnalysisRagErrorPayload): string =>
  payload.code === ErrorCode.RAG_QA_ABORTED
    ? "요청이 중단되었습니다."
    : payload.message ?? "Error";

export default function AnalysisSection() {
  const { currentItem: currentChapter } = useChapterStore(
    useShallow((state) => ({ currentItem: state.currentItem })),
  );
  const currentProject = useProjectStore((state) => state.currentItem);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [ragRunId, setRagRunId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [runtimeInfo, setRuntimeInfo] = useState<AnalysisRuntimeInfo>(null);
  const [runtimePreference, setRuntimePreference] = useState<RuntimePreference>("auto");
  const [memoryScope, setMemoryScope] = useState<MemoryScope>("current-only");
  const [sidecarStatus, setSidecarStatus] = useState<AnalysisSidecarStatus>(null);
  const [showConflictQueue, setShowConflictQueue] = useState(false);
  const [conflictItems, setConflictItems] = useState<AnalysisConflictItem[]>([]);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);
  const [showEpisodeReview, setShowEpisodeReview] = useState(false);
  const [episodeReviewItems, setEpisodeReviewItems] = useState<AnalysisEpisodeReviewItem[]>([]);
  const [episodeReviewLoading, setEpisodeReviewLoading] = useState(false);
  const [episodeReviewError, setEpisodeReviewError] = useState<string | null>(null);
  const [rejectingEpisodeId, setRejectingEpisodeId] = useState<string | null>(null);
  const [showFactReview, setShowFactReview] = useState(false);
  const [factReviewItems, setFactReviewItems] = useState<AnalysisFactReviewItem[]>([]);
  const [factReviewLoading, setFactReviewLoading] = useState(false);
  const [factReviewError, setFactReviewError] = useState<string | null>(null);
  const [mutatingFactId, setMutatingFactId] = useState<string | null>(null);
  const [showEntityReview, setShowEntityReview] = useState(false);
  const [entityReviewItems, setEntityReviewItems] = useState<AnalysisEntityReviewItem[]>([]);
  const [entityReviewLoading, setEntityReviewLoading] = useState(false);
  const [entityReviewError, setEntityReviewError] = useState<string | null>(null);
  const [mutatingEntityId, setMutatingEntityId] = useState<string | null>(null);
  const [showEntityAliasReview, setShowEntityAliasReview] = useState(false);
  const [entityAliasReviewItems, setEntityAliasReviewItems] = useState<
    AnalysisEntityAliasReviewItem[]
  >([]);
  const [entityAliasReviewLoading, setEntityAliasReviewLoading] = useState(false);
  const [entityAliasReviewError, setEntityAliasReviewError] = useState<string | null>(null);
  const [mutatingAliasId, setMutatingAliasId] = useState<string | null>(null);
  const [showNarrativeSummaryStatus, setShowNarrativeSummaryStatus] = useState(false);
  const [narrativeSummaryStatus, setNarrativeSummaryStatus] =
    useState<AnalysisNarrativeSummaryStatus | null>(null);
  const [narrativeSummaryStatusLoading, setNarrativeSummaryStatusLoading] = useState(false);
  const [narrativeSummaryStatusError, setNarrativeSummaryStatusError] = useState<string | null>(null);
  const [showMemoryEvalReport, setShowMemoryEvalReport] = useState(false);
  const [memoryEvalReport, setMemoryEvalReport] = useState<AnalysisMemoryEvalReport | null>(null);
  const [intentCalibrationReport, setIntentCalibrationReport] =
    useState<AnalysisIntentCalibrationReport | null>(null);
  const [episodeCalibrationReport, setEpisodeCalibrationReport] =
    useState<AnalysisEpisodeCalibrationReport | null>(null);
  const [memoryEvalLoading, setMemoryEvalLoading] = useState(false);
  const [memoryEvalError, setMemoryEvalError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const dialog = useDialog();

  useEffect(() => {
    void (async () => {
      const all = await api.settings.getAll();
      if (all.success) {
        const provider = all.data?.llm?.preferredProvider;
        if (provider) {
          setRuntimePreference(provider);
        }
      }

      const runtime = await api.settings.getLlmRuntime();
      if (runtime.success && runtime.data) {
        setRuntimeInfo(runtime.data);
      }

      const sidecar = await api.settings.getSidecarStatus();
      if (sidecar.success && sidecar.data) {
        setSidecarStatus(sidecar.data);
      }
    })();
  }, []);

  useEffect(() => {
    return api.settings.onSidecarStatusChanged((event) => {
      if (event.purpose !== "chat") return;
      setSidecarStatus(event.status);
    });
  }, []);

  const applyRuntimePreference = useCallback(
    async (next: RuntimePreference) => {
      const response = await api.settings.setLlmPreference({ provider: next });
      if (!response.success) {
        showToast(response.error?.message ?? "LLM preference 변경 실패", "error");
        return;
      }

      const runtime = await api.settings.getLlmRuntime();
      if (!runtime.success || !runtime.data) {
        return;
      }

      setRuntimeInfo(runtime.data);
      const sidecar = await api.settings.getSidecarStatus();
      if (sidecar.success && sidecar.data) {
        setSidecarStatus(sidecar.data);
      }

      if (runtime.data.resolvedProvider === "unavailable") {
        const reason =
          runtime.data.skipped?.[0]?.message ??
          "선택한 LLM 경로를 사용할 수 없습니다.";
        const confirmed = await dialog.confirm({
          title: "LLM 경로 사용 불가",
          message: `${reason}\n\n설정 페이지의 모델 탭을 여시겠습니까?`,
        });
        if (confirmed) {
          window.dispatchEvent(
            new CustomEvent("luie:open-settings", { detail: { tab: "model" } }),
          );
        }
        return;
      }

      setRuntimePreference(next);
      showToast(
        `LLM 경로 변경: ${next} → ${runtime.data.resolvedProvider ?? runtime.data.provider}`,
        "info",
      );
    },
    [dialog, showToast],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showConflictQueue || !currentProject?.id) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setConflictLoading(true);
      setConflictError(null);

      try {
        const response = await api.memory.getConflictQueue({
          projectId: currentProject.id,
          chapterId: currentChapter?.id,
          includePriorMemory: memoryScope === "with-prior",
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setConflictError(response.error?.message ?? "충돌 큐 조회 실패");
          setConflictItems([]);
          return;
        }
        setConflictItems(response.data.items);
      } finally {
        if (!cancelled) {
          setConflictLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentChapter?.id, currentProject?.id, memoryScope, showConflictQueue]);

  useEffect(() => {
    if (!showEpisodeReview || !currentProject?.id) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setEpisodeReviewLoading(true);
      setEpisodeReviewError(null);

      try {
        const response = await api.memory.getEpisodeReviewQueue({
          projectId: currentProject.id,
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setEpisodeReviewError(response.error?.message ?? "에피소드 검토 큐 조회 실패");
          setEpisodeReviewItems([]);
          return;
        }
        setEpisodeReviewItems(response.data.items);
      } finally {
        if (!cancelled) {
          setEpisodeReviewLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, showEpisodeReview]);

  useEffect(() => {
    if (!showFactReview || !currentProject?.id) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setFactReviewLoading(true);
      setFactReviewError(null);

      try {
        const response = await api.memory.getFactReviewQueue({
          projectId: currentProject.id,
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setFactReviewError(response.error?.message ?? "사실 검토 큐 조회 실패");
          setFactReviewItems([]);
          return;
        }
        setFactReviewItems(response.data.items);
      } finally {
        if (!cancelled) {
          setFactReviewLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, showFactReview]);

  useEffect(() => {
    if (!showEntityAliasReview || !currentProject?.id) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setEntityAliasReviewLoading(true);
      setEntityAliasReviewError(null);

      try {
        const response = await api.memory.getEntityAliasReviewQueue({
          projectId: currentProject.id,
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setEntityAliasReviewError(response.error?.message ?? "별칭 검토 큐 조회 실패");
          setEntityAliasReviewItems([]);
          return;
        }
        setEntityAliasReviewItems(response.data.items);
      } finally {
        if (!cancelled) {
          setEntityAliasReviewLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, showEntityAliasReview]);

  useEffect(() => {
    if (!showEntityReview || !currentProject?.id) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setEntityReviewLoading(true);
      setEntityReviewError(null);

      try {
        const response = await api.memory.getEntityReviewQueue({
          projectId: currentProject.id,
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setEntityReviewError(response.error?.message ?? "엔티티 검토 큐 조회 실패");
          setEntityReviewItems([]);
          return;
        }
        setEntityReviewItems(response.data.items);
      } finally {
        if (!cancelled) {
          setEntityReviewLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, showEntityReview]);

  useEffect(() => {
    if (!showNarrativeSummaryStatus || !currentProject?.id) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setNarrativeSummaryStatusLoading(true);
      setNarrativeSummaryStatusError(null);

      try {
        const response = await api.memory.getNarrativeSummaryStatus(currentProject.id);
        if (cancelled) return;
        if (!response.success || !response.data) {
          setNarrativeSummaryStatusError(
            response.error?.message ?? "서사 요약 상태 조회 실패",
          );
          setNarrativeSummaryStatus(null);
          return;
        }
        setNarrativeSummaryStatus(response.data);
      } finally {
        if (!cancelled) {
          setNarrativeSummaryStatusLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, showNarrativeSummaryStatus]);

  useEffect(() => {
    if (!ragRunId) {
      return;
    }

    const offStream = api.rag.onStream((payload: AnalysisRagStreamPayload) => {
      if (payload.runId !== ragRunId) return;

      if (payload.delta) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === ragRunId
              ? { ...message, content: message.content + payload.delta }
              : message,
          ),
        );
      }

      if (!payload.done) {
        return;
      }

      setIsStreaming(false);
      setRagRunId(null);

      if (payload.result) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === ragRunId
              ? {
                  ...message,
                  content: payload.result?.answer ?? message.content,
                  evidence: payload.result?.evidence ?? [],
                  grounding: payload.result?.grounding,
                  narrativeMemory: payload.result?.narrativeMemory,
                  isStreaming: false,
                }
              : message,
          ),
        );
      }
    }, ragRunId);

    const offError = api.rag.onError((payload: AnalysisRagErrorPayload) => {
      if (payload.runId && payload.runId !== ragRunId) return;
      setIsStreaming(false);
      setRagRunId(null);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === ragRunId
            ? { ...message, isStreaming: false, error: renderErrorMessage(payload) }
            : message,
        ),
      );
    }, ragRunId);

    return () => {
      offStream();
      offError();
    };
  }, [ragRunId]);

  const handleSend = useCallback(async () => {
    if (!currentProject?.id || !input.trim() || isStreaming) return;

    const question = input.trim();
    const userMessageId = `user-${Date.now()}`;
    const assistantMsgId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: question },
      { id: assistantMsgId, role: "assistant", content: "", isStreaming: true },
    ]);
    setInput("");
    setIsStreaming(true);

    const res = await api.rag.ask({
      projectId: currentProject.id,
      question,
      chapterId: currentChapter?.id ?? undefined,
      includePriorMemory: memoryScope === "with-prior",
    });

    if (!res.success || !res.data?.runId) {
      setIsStreaming(false);
      const errMsg = res.error?.message ?? "Failed to start";
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMsgId
            ? { ...message, isStreaming: false, error: errMsg }
            : message,
        ),
      );
      showToast(errMsg, "error");
      return;
    }

    setRagRunId(res.data.runId);
    setMessages((prev) =>
      prev.map((message) =>
        message.id === assistantMsgId ? { ...message, id: res.data!.runId } : message,
      ),
    );
  }, [currentProject, currentChapter, input, isStreaming, memoryScope, showToast]);

  const handleStop = useCallback(async () => {
    if (!ragRunId) return;
    await api.rag.stop(ragRunId);
    setIsStreaming(false);
    setRagRunId(null);
    setMessages((prev) =>
      prev.map((message) =>
        message.isStreaming ? { ...message, isStreaming: false } : message,
      ),
    );
  }, [ragRunId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }
      event.preventDefault();
      void handleSend();
    },
    [handleSend],
  );

  const handleJumpEvidence = useCallback(async (item: ChatChunkItem) => {
    if (!item.chapterId) {
      return;
    }
    await api.memory.getChunkBacklink(item.chunkId);
    requestChapterNavigation({
      chapterId: item.chapterId,
      query: item.quote?.trim().slice(0, 48),
    });
  }, []);

  const handleResolveConflict = useCallback(
    async (item: AnalysisConflictItem, winnerFactId: string) => {
      if (!currentProject?.id) {
        return;
      }

      const confirmed = await dialog.confirm({
        title: "충돌 해결",
        message: "선택한 사실을 확정하고 반대 사실을 거절 처리합니다.",
      });
      if (!confirmed) {
        return;
      }

      setResolvingConflictId(item.conflictId);
      try {
        const response = await api.memory.resolveFactConflict({
          projectId: currentProject.id,
          conflictId: item.conflictId,
          winnerFactId,
          reason: "사용자 충돌 해결",
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "충돌 해결 실패", "error");
          return;
        }
        setConflictItems((prev) =>
          prev.filter((conflict) => conflict.conflictId !== item.conflictId),
        );
        showToast("충돌을 해결했습니다.", "info");
      } finally {
        setResolvingConflictId(null);
      }
    },
    [currentProject?.id, dialog, showToast],
  );

  const handleRejectEpisode = useCallback(
    async (item: AnalysisEpisodeReviewItem) => {
      if (!currentProject?.id) {
        return;
      }

      const reason = await dialog.prompt({
        title: "거절 사유",
        defaultValue: "근거 부족",
        placeholder: "거절 사유",
      });
      if (!reason?.trim()) {
        return;
      }

      setRejectingEpisodeId(item.id);
      try {
        const response = await api.memory.rejectEpisode({
          projectId: currentProject.id,
          episodeId: item.id,
          reason: reason.trim(),
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "에피소드 거절 실패", "error");
          return;
        }
        setEpisodeReviewItems((prev) =>
          prev.filter((episode) => episode.id !== item.id),
        );
        showToast("에피소드 후보를 거절했습니다.", "info");
      } finally {
        setRejectingEpisodeId(null);
      }
    },
    [currentProject?.id, dialog, showToast],
  );

  const handleConfirmFact = useCallback(
    async (item: AnalysisFactReviewItem) => {
      if (!currentProject?.id) {
        return;
      }

      setMutatingFactId(item.id);
      try {
        const response = await api.memory.confirmFact({
          projectId: currentProject.id,
          factId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "사실 확정 실패", "error");
          return;
        }
        setFactReviewItems((prev) => prev.filter((fact) => fact.id !== item.id));
        showToast("사실 후보를 canonical memory로 승인했습니다.", "info");
      } finally {
        setMutatingFactId(null);
      }
    },
    [currentProject?.id, showToast],
  );

  const handleRejectFact = useCallback(
    async (item: AnalysisFactReviewItem) => {
      if (!currentProject?.id) {
        return;
      }

      const reason = await dialog.prompt({
        title: "거절 사유",
        defaultValue: "근거 부족",
        placeholder: "거절 사유",
      });
      if (!reason?.trim()) {
        return;
      }

      setMutatingFactId(item.id);
      try {
        const response = await api.memory.rejectFact({
          projectId: currentProject.id,
          factId: item.id,
          reason: reason.trim(),
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "사실 거절 실패", "error");
          return;
        }
        setFactReviewItems((prev) => prev.filter((fact) => fact.id !== item.id));
        showToast("사실 후보를 거절했습니다.", "info");
      } finally {
        setMutatingFactId(null);
      }
    },
    [currentProject?.id, dialog, showToast],
  );

  const handleConfirmEntity = useCallback(
    async (item: AnalysisEntityReviewItem) => {
      if (!currentProject?.id) {
        return;
      }

      setMutatingEntityId(item.id);
      try {
        const response = await api.memory.confirmEntity({
          projectId: currentProject.id,
          entityId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "엔티티 확정 실패", "error");
          return;
        }
        setEntityReviewItems((prev) =>
          prev.filter((entity) => entity.id !== item.id),
        );
        showToast("엔티티 후보를 canonical memory로 승인했습니다.", "info");
      } finally {
        setMutatingEntityId(null);
      }
    },
    [currentProject?.id, showToast],
  );

  const handleRejectEntity = useCallback(
    async (item: AnalysisEntityReviewItem) => {
      if (!currentProject?.id) {
        return;
      }

      const confirmed = await dialog.confirm({
        title: "엔티티 거절",
        message: `${item.canonicalName} 후보를 거절합니다.`,
      });
      if (!confirmed) {
        return;
      }

      setMutatingEntityId(item.id);
      try {
        const response = await api.memory.rejectEntity({
          projectId: currentProject.id,
          entityId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "엔티티 거절 실패", "error");
          return;
        }
        setEntityReviewItems((prev) =>
          prev.filter((entity) => entity.id !== item.id),
        );
        showToast("엔티티 후보를 거절했습니다.", "info");
      } finally {
        setMutatingEntityId(null);
      }
    },
    [currentProject?.id, dialog, showToast],
  );

  const handleConfirmEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem) => {
      if (!currentProject?.id) {
        return;
      }

      setMutatingAliasId(item.id);
      try {
        const response = await api.memory.confirmEntityAlias({
          projectId: currentProject.id,
          aliasId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "별칭 확정 실패", "error");
          return;
        }
        setEntityAliasReviewItems((prev) =>
          prev.filter((alias) => alias.id !== item.id),
        );
        showToast("별칭 후보를 확정했습니다.", "info");
      } finally {
        setMutatingAliasId(null);
      }
    },
    [currentProject?.id, showToast],
  );

  const handleRejectEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem) => {
      if (!currentProject?.id) {
        return;
      }

      const confirmed = await dialog.confirm({
        title: "별칭 거절",
        message: `${item.canonicalName} = ${item.alias} 후보를 거절합니다.`,
      });
      if (!confirmed) {
        return;
      }

      setMutatingAliasId(item.id);
      try {
        const response = await api.memory.rejectEntityAlias({
          projectId: currentProject.id,
          aliasId: item.id,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "별칭 거절 실패", "error");
          return;
        }
        setEntityAliasReviewItems((prev) =>
          prev.filter((alias) => alias.id !== item.id),
        );
        showToast("별칭 후보를 거절했습니다.", "info");
      } finally {
        setMutatingAliasId(null);
      }
    },
    [currentProject?.id, dialog, showToast],
  );

  const handleMergeEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem, targetEntityId: string) => {
      if (!currentProject?.id || !targetEntityId) {
        return;
      }

      const confirmed = await dialog.confirm({
        title: "엔티티 통합",
        message: `${item.canonicalName} 후보를 선택한 targetEntityId로 통합합니다.`,
      });
      if (!confirmed) {
        return;
      }

      setMutatingAliasId(item.id);
      try {
        const response = await api.memory.mergeEntity({
          projectId: currentProject.id,
          targetEntityId,
          sourceEntityId: item.entityId,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "엔티티 통합 실패", "error");
          return;
        }
        setEntityAliasReviewItems((prev) =>
          prev.filter((alias) => alias.id !== item.id),
        );
        showToast("엔티티를 통합했습니다.", "info");
      } finally {
        setMutatingAliasId(null);
      }
    },
    [currentProject?.id, dialog, showToast],
  );

  const handleSplitEntityAlias = useCallback(
    async (item: AnalysisEntityAliasReviewItem, canonicalName: string) => {
      if (!currentProject?.id || !canonicalName) {
        return;
      }

      const confirmed = await dialog.confirm({
        title: "엔티티 분리",
        message: `${item.alias} 후보를 새 canonical entity로 분리합니다.`,
      });
      if (!confirmed) {
        return;
      }

      setMutatingAliasId(item.id);
      try {
        const response = await api.memory.splitEntityAlias({
          projectId: currentProject.id,
          aliasId: item.id,
          canonicalName,
        });
        if (!response.success || !response.data?.updated) {
          showToast(response.error?.message ?? "엔티티 분리 실패", "error");
          return;
        }
        setEntityAliasReviewItems((prev) =>
          prev.filter((alias) => alias.id !== item.id),
        );
        showToast("엔티티를 분리했습니다.", "info");
      } finally {
        setMutatingAliasId(null);
      }
    },
    [currentProject?.id, dialog, showToast],
  );

  const handleRunMemoryEval = useCallback(async () => {
    if (!currentProject?.id) {
      return;
    }

    setMemoryEvalLoading(true);
    setMemoryEvalError(null);
    try {
      const response = await api.memoryAdmin.runEvalSuite({
        projectId: currentProject.id,
        label: "analysis-panel",
        topK: 5,
      });
      if (!response.success || !response.data) {
        setMemoryEvalError(response.error?.message ?? "메모리 평가 실패");
        return;
      }
      setMemoryEvalReport(response.data);
      setShowMemoryEvalReport(true);
      showToast("메모리 평가를 완료했습니다.", "info");
    } finally {
      setMemoryEvalLoading(false);
    }
  }, [currentProject?.id, showToast]);

  const handleRunIntentCalibration = useCallback(async () => {
    if (!currentProject?.id) {
      return;
    }

    setMemoryEvalLoading(true);
    setMemoryEvalError(null);
    try {
      const response = await api.memoryAdmin.runIntentCalibration({
        projectId: currentProject.id,
        useLlm: true,
      });
      if (!response.success || !response.data) {
        setMemoryEvalError(response.error?.message ?? "LLM intent calibration 실패");
        return;
      }
      setIntentCalibrationReport(response.data);
      setShowMemoryEvalReport(true);
      showToast("LLM intent calibration을 완료했습니다.", "info");
    } finally {
      setMemoryEvalLoading(false);
    }
  }, [currentProject?.id, showToast]);

  const handleRunEpisodeCalibration = useCallback(async () => {
    if (!currentProject?.id) {
      return;
    }

    setMemoryEvalLoading(true);
    setMemoryEvalError(null);
    try {
      const response = await api.memoryAdmin.runEpisodeCalibration({
        projectId: currentProject.id,
      });
      if (!response.success || !response.data) {
        setMemoryEvalError(response.error?.message ?? "LLM episode calibration 실패");
        return;
      }
      setEpisodeCalibrationReport(response.data);
      setShowMemoryEvalReport(true);
      showToast("LLM episode calibration을 완료했습니다.", "info");
    } finally {
      setMemoryEvalLoading(false);
    }
  }, [currentProject?.id, showToast]);

  return (
    <div className="flex flex-col h-full bg-panel text-fg">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">
        <ConflictQueuePanel
          visible={showConflictQueue}
          loading={conflictLoading}
          error={conflictError}
          items={conflictItems}
          onToggle={() => setShowConflictQueue((prev) => !prev)}
          renderFact={formatConflictFact}
          resolvingConflictId={resolvingConflictId}
          onResolve={(item, winnerFactId) =>
            void handleResolveConflict(item, winnerFactId)
          }
        />
        <EpisodeReviewPanel
          visible={showEpisodeReview}
          loading={episodeReviewLoading}
          error={episodeReviewError}
          items={episodeReviewItems}
          rejectingEpisodeId={rejectingEpisodeId}
          onToggle={() => setShowEpisodeReview((prev) => !prev)}
          onReject={(item) => void handleRejectEpisode(item)}
        />
        <FactReviewPanel
          visible={showFactReview}
          loading={factReviewLoading}
          error={factReviewError}
          items={factReviewItems}
          mutatingFactId={mutatingFactId}
          onToggle={() => setShowFactReview((prev) => !prev)}
          onConfirm={(item) => void handleConfirmFact(item)}
          onReject={(item) => void handleRejectFact(item)}
        />
        <EntityReviewPanel
          visible={showEntityReview}
          loading={entityReviewLoading}
          error={entityReviewError}
          items={entityReviewItems}
          mutatingEntityId={mutatingEntityId}
          onToggle={() => setShowEntityReview((prev) => !prev)}
          onConfirm={(item) => void handleConfirmEntity(item)}
          onReject={(item) => void handleRejectEntity(item)}
        />
        <EntityAliasReviewPanel
          visible={showEntityAliasReview}
          loading={entityAliasReviewLoading}
          error={entityAliasReviewError}
          items={entityAliasReviewItems}
          mutatingAliasId={mutatingAliasId}
          onToggle={() => setShowEntityAliasReview((prev) => !prev)}
          onConfirm={(item) => void handleConfirmEntityAlias(item)}
          onReject={(item) => void handleRejectEntityAlias(item)}
          onMerge={(item, targetEntityId) =>
            void handleMergeEntityAlias(item, targetEntityId)
          }
          onSplit={(item, canonicalName) =>
            void handleSplitEntityAlias(item, canonicalName)
          }
        />
        <NarrativeSummaryStatusPanel
          visible={showNarrativeSummaryStatus}
          loading={narrativeSummaryStatusLoading}
          error={narrativeSummaryStatusError}
          status={narrativeSummaryStatus}
          onToggle={() => setShowNarrativeSummaryStatus((prev) => !prev)}
        />
        <MemoryEvalReportPanel
          visible={showMemoryEvalReport}
          loading={memoryEvalLoading}
          error={memoryEvalError}
          report={memoryEvalReport}
          intentCalibrationReport={intentCalibrationReport}
          episodeCalibrationReport={episodeCalibrationReport}
          onToggle={() => setShowMemoryEvalReport((prev) => !prev)}
          onRun={() => void handleRunMemoryEval()}
          onRunIntentCalibration={() => void handleRunIntentCalibration()}
          onRunEpisodeCalibration={() => void handleRunEpisodeCalibration()}
        />

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
            <p className="text-sm text-center">
              {currentChapter
                ? `Context: ${currentChapter.title}`
                : "원고 내용에 대해 질문하세요"}
            </p>
          </div>
        )}

        <MessageList messages={messages} onJumpEvidence={handleJumpEvidence} />
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border p-3 bg-panel">
        <div className="mb-2 flex items-center gap-2 px-1">
          <label htmlFor="analysis-runtime-pref" className="text-[11px] text-muted">
            Route
          </label>
          <select
            id="analysis-runtime-pref"
            value={runtimePreference}
            onChange={(event) => void applyRuntimePreference(event.target.value as RuntimePreference)}
            className="h-7 rounded border border-border bg-surface px-2 text-xs text-fg"
          >
            <option value="auto">auto</option>
            <optgroup label="Local">
              <option value="sidecar">Sidecar</option>
            </optgroup>
            <optgroup label="Cloud">
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </optgroup>
            <optgroup label="Advanced">
              <option value="ollama">Ollama</option>
            </optgroup>
          </select>

          <label
            htmlFor="analysis-memory-scope"
            className="text-[11px] text-muted ml-1"
          >
            Memory
          </label>
          <select
            id="analysis-memory-scope"
            value={memoryScope}
            onChange={(event) => setMemoryScope(event.target.value as MemoryScope)}
            className="h-7 rounded border border-border bg-surface px-2 text-xs text-fg"
          >
            <option value="current-only">현재 챕터만</option>
            <option value="with-prior">현재+과거</option>
          </select>
        </div>

        <RuntimeStatusPanel runtimeInfo={runtimeInfo} sidecarStatus={sidecarStatus} />

        {currentChapter && (
          <div className="text-xs text-muted mb-2 flex items-center gap-1.5 font-medium px-1">
            <span>Context: {currentChapter.title}</span>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 text-sm bg-surface border border-border rounded-xl px-3.5 py-2.5 resize-none text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px] max-h-[160px] transition-shadow"
            placeholder="질문 입력... (Enter 전송, Shift+Enter 줄바꿈)"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={!currentProject}
          />
          <Button
            onClick={isStreaming ? () => void handleStop() : () => void handleSend()}
            disabled={!currentProject || (!isStreaming && !input.trim())}
            size="icon"
            className="shrink-0 h-[44px] w-[44px] rounded-xl shadow-sm disabled:opacity-50"
          >
            {isStreaming ? <Square className="w-4 h-4 fill-current" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
