import { useCallback, useEffect, useRef } from "react";
import Worker from "@renderer/features/editor/workers/stats.worker?worker";
import { useEditorStatsStore } from "@renderer/features/editor/stores/editorStatsStore";

interface Stats {
  wordCount: number;
  charCount: number;
}

export function useEditorStats() {
  const setStats = useEditorStatsStore((state) => state.setStats);
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const worker = new Worker();

    worker.onmessage = (event: MessageEvent<Stats>) => {
      setStats(event.data);
    };

    workerRef.current = worker;

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      worker.terminate();
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
