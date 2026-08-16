import { useState, useCallback, useEffect, useRef } from "react";
import { DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS } from "@shared/constants";

/** 입력은 즉시 반영하되 parent update는 debounce하고 dirty 상태의 window 종료를 막는다. */
export function useBufferedInput(
  initialValue: string,
  onUpdate: (value: string) => void,
  debounceMs: number = DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS,
) {
  const [value, setValue] = useState(initialValue);
  const [isDirty, setIsDirty] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestValueRef = useRef(initialValue);

  useEffect(() => {
    if (!isDirty) {
      latestValueRef.current = initialValue;
    }
  }, [initialValue, isDirty]);

  const handleChange = useCallback(
    (newValue: string) => {
      setValue(newValue);
      setIsDirty(true);
      latestValueRef.current = newValue;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onUpdate(newValue);
        setIsDirty(false);
      }, debounceMs);
    },
    [onUpdate, debounceMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        if (isDirty) {
          onUpdate(latestValueRef.current);
        }
      }
    };
  }, [isDirty, onUpdate]);

  // NOTE: 아직 flush하지 않은 입력이 있으면 browser 종료를 막는다.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return {
    value: isDirty ? value : initialValue,
    onChange: handleChange,
    isDirty,
    flush: () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        onUpdate(latestValueRef.current);
        setIsDirty(false);
      }
    },
  };
}
