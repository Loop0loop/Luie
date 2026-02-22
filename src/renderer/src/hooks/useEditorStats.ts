import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "../stores/editorStore";

type Stats = {
  wordCount: number;
  charCount: number;
};

export function useEditorStats() {
  const [stats, setStats] = useState<Stats>({ wordCount: 0, charCount: 0 });
  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/stats.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent<Stats>) => {
      setStats(event.data);
      useEditorStore.getState().setStats(event.data);
    };

    workerRef.current = worker;

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const updateStats = useCallback((text: string) => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      workerRef.current?.postMessage({ text });
    }, 120);
  }, []);

  return {
    wordCount: stats.wordCount,
    charCount: stats.charCount,
    updateStats,
  };
}
