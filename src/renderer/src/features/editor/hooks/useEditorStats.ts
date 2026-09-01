import { useCallback, useEffect, useRef } from "react";
import { useEditorStatsStore } from "@renderer/features/editor/stores/editorStatsStore";
import { acquireStatsWorker } from "@renderer/features/editor/hooks/statsWorkerClient";

interface Stats {
  wordCount: number;
  charCount: number;
}

export function useEditorStats() {
  const setStats = useEditorStatsStore((state) => state.setStats);
  const workerRef = useRef<ReturnType<typeof acquireStatsWorker> | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // NOTE: Worker는 앱 전역 싱글턴이다(전환마다 스폰/terminate 낭비 제거). 인스턴스가
    // 아니라 "리스너"의 수명을 이 훅이 관리한다.
    const worker = acquireStatsWorker();

    const handleMessage = (event: MessageEvent<Stats>) => {
      setStats(event.data);
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
  }, [setStats]);

  const updateStats = useCallback((text: string) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      workerRef.current?.postMessage({ text });
    }, 120);
  }, []);

  return { updateStats };
}
