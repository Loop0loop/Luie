import { useState, useCallback, useEffect, useRef } from "react";
import { DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS } from "../../../shared/constants";

/**
 * useBufferedInput
 * - Manages local state for immediate UI feedback (zero latency).
 * - Debounces updates to the global store/parent.
 * - Adds safety check for unsaved changes on unmount/reload.
 */
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

  // Flush on unmount
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

  // Prevent accidental close if dirty
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
