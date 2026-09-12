import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useEditorStatsStore } from "@renderer/features/editor/stores/editorStatsStore";
import { acquireStatsWorker } from "@renderer/features/editor/hooks/statsWorkerClient";

interface Stats {
  clientId: number;
  requestId: number;
  statsKey?: string;
  wordCount: number;
  charCount: number;
}

let nextClientId = 0;

export function useEditorStats({
  enabled = true,
  statsKey,
}: {
  enabled?: boolean;
  statsKey?: string;
} = {}) {
  const setStats = useEditorStatsStore((state) => state.setStats);
  const workerRef = useRef<ReturnType<typeof acquireStatsWorker> | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const clientIdRef = useRef(++nextClientId);
  const latestRequestIdRef = useRef(0);
  const statsKeyRef = useRef(statsKey);

  useLayoutEffect(() => {
    statsKeyRef.current = statsKey;
    // 렌더 커밋 직후부터 이전 챕터의 늦은 응답을 받지 않는다.
    latestRequestIdRef.current += 1;
  }, [statsKey]);

  useEffect(() => {
    if (!enabled) return undefined;
    // NOTE: Worker는 앱 전역 싱글턴이다(전환마다 스폰/terminate 낭비 제거). 인스턴스가
    // 아니라 "리스너"의 수명을 이 훅이 관리한다.
    const worker = acquireStatsWorker();

    const handleMessage = (event: MessageEvent<Stats>) => {
      if (
        event.data.clientId !== clientIdRef.current ||
        event.data.requestId !== latestRequestIdRef.current ||
        event.data.statsKey !== statsKeyRef.current
      ) {
        return;
      }
      setStats({
        wordCount: event.data.wordCount,
        charCount: event.data.charCount,
      });
    };

    worker.addEventListener("message", handleMessage);
    workerRef.current = worker;

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      worker.removeEventListener("message", handleMessage);
      workerRef.current = null;
    };
  }, [enabled, setStats]);

  const updateStats = useCallback((text: string) => {
    if (!enabled) return;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      workerRef.current?.postMessage({
        clientId: clientIdRef.current,
        requestId,
        statsKey: statsKeyRef.current,
        text,
      });
    }, 120);
  }, [enabled]);

  return { updateStats };
}
