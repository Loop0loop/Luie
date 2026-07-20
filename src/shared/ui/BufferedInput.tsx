import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS } from "@shared/constants";
import {
  preserveUnmountSave,
  registerSaveBufferFlush,
} from "./saveBufferRegistry";

const COMPOSITION_UNMOUNT_ERROR =
  "Save buffer unmounted before IME composition completed";

type PendingCompositionFlush = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason: unknown) => void;
};

const createPendingCompositionFlush = (): PendingCompositionFlush => {
  let resolve: () => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const consumeBackgroundFlush = (result: void | Promise<unknown>): void => {
  void Promise.resolve(result).catch(() => undefined);
};

interface BufferedInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: string;
  onSave: (value: string) => void | Promise<unknown>;
  debounceTime?: number;
}

export function BufferedInput({
  value: externalValue,
  onSave,
  debounceTime = DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS,
  ...props
}: BufferedInputProps) {
  const [localValue, setLocalValue] = useState(externalValue);
  const isComposing = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const debounceTimer = useRef<number | null>(null);
  const latestValue = useRef(externalValue);
  const lastSavedValue = useRef(externalValue);
  const onSaveRef = useRef(onSave);
  const flushRef = useRef<(explicit?: boolean) => void | Promise<unknown>>(
    () => undefined,
  );
  const inFlightSave = useRef<{
    value: string;
    promise: Promise<void>;
  } | null>(null);
  const pendingCompositionFlush = useRef<PendingCompositionFlush | null>(null);
  const compositionAborted = useRef(false);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const displayedValue = useMemo(() => {
    return isEditing ? localValue : externalValue;
  }, [externalValue, isEditing, localValue]);

  const cancelScheduledSave = () => {
    if (debounceTimer.current !== null) {
      window.clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  };

  const flush = (
    explicit = false,
    value = latestValue.current,
  ): void | Promise<void> => {
    if (compositionAborted.current) {
      return explicit
        ? Promise.reject(new Error(COMPOSITION_UNMOUNT_ERROR))
        : undefined;
    }
    cancelScheduledSave();
    if (isComposing.current) {
      if (!explicit) return;
      pendingCompositionFlush.current ??= createPendingCompositionFlush();
      return pendingCompositionFlush.current.promise;
    }
    const inFlight = inFlightSave.current;
    if (inFlight) {
      if (value === inFlight.value) return inFlight.promise;
      return inFlight.promise.then(async () => {
        await flushRef.current(explicit);
      });
    }
    if (value === lastSavedValue.current) return;

    let result: void | Promise<unknown>;
    try {
      result = onSaveRef.current(value);
    } catch (error) {
      result = Promise.reject(error);
    }

    const promise = Promise.resolve(result)
      .then(() => {
        lastSavedValue.current = value;
      })
      .finally(() => {
        if (inFlightSave.current?.promise === promise) {
          inFlightSave.current = null;
        }
      });
    inFlightSave.current = { value, promise };
    return promise;
  };

  useEffect(() => {
    flushRef.current = flush;
  });

  useEffect(
    () =>
      registerSaveBufferFlush(async () => {
        await flushRef.current(true);
      }),
    [],
  );

  const scheduleSave = (value: string) => {
    latestValue.current = value;
    cancelScheduledSave();
    debounceTimer.current = window.setTimeout(() => {
      debounceTimer.current = null;
      consumeBackgroundFlush(flush(false, value));
    }, debounceTime);
  };

  useEffect(
    () => () => {
      cancelScheduledSave();
      const pending = pendingCompositionFlush.current;
      if (pending) {
        pendingCompositionFlush.current = null;
        pending.reject(new Error(COMPOSITION_UNMOUNT_ERROR));
      }
      if (isComposing.current) {
        compositionAborted.current = true;
        return;
      }
      const value = latestValue.current;
      if (value === lastSavedValue.current && !inFlightSave.current) return;
      const initial = flushRef.current();
      preserveUnmountSave(initial, () => onSaveRef.current(value));
    },
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    latestValue.current = next;
    if (!isComposing.current) {
      scheduleSave(next);
    }
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
    cancelScheduledSave();
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLInputElement>,
  ) => {
    isComposing.current = false;
    const next = e.currentTarget.value;
    setLocalValue(next);
    latestValue.current = next;
    const pending = pendingCompositionFlush.current;
    if (!pending) {
      scheduleSave(next);
      return;
    }
    pendingCompositionFlush.current = null;
    void Promise.resolve(flush(true, next)).then(
      pending.resolve,
      pending.reject,
    );
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    setLocalValue(externalValue);
    latestValue.current = externalValue;
    lastSavedValue.current = externalValue;
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(false);
    latestValue.current = e.target.value;
    consumeBackgroundFlush(flush());
    props.onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isComposing.current) {
      consumeBackgroundFlush(flush(false, localValue));
      e.currentTarget.blur();
    }
    props.onKeyDown?.(e);
  };

  return (
    <input
      {...props}
      value={displayedValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}

interface BufferedTextAreaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> {
  value: string;
  onSave: (value: string) => void | Promise<unknown>;
}

export function BufferedTextArea({
  value: externalValue,
  onSave,
  ...props
}: BufferedTextAreaProps) {
  const [localValue, setLocalValue] = useState(externalValue);
  const isComposing = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const latestValue = useRef(externalValue);
  const lastSavedValue = useRef(externalValue);
  const onSaveRef = useRef(onSave);
  const flushRef = useRef<(explicit?: boolean) => void | Promise<unknown>>(
    () => undefined,
  );
  const inFlightSave = useRef<{
    value: string;
    promise: Promise<void>;
  } | null>(null);
  const pendingCompositionFlush = useRef<PendingCompositionFlush | null>(null);
  const compositionAborted = useRef(false);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const displayedValue = useMemo(() => {
    return isEditing ? localValue : externalValue;
  }, [externalValue, isEditing, localValue]);

  const flush = (
    explicit = false,
    value = latestValue.current,
  ): void | Promise<void> => {
    if (compositionAborted.current) {
      return explicit
        ? Promise.reject(new Error(COMPOSITION_UNMOUNT_ERROR))
        : undefined;
    }
    if (isComposing.current) {
      if (!explicit) return;
      pendingCompositionFlush.current ??= createPendingCompositionFlush();
      return pendingCompositionFlush.current.promise;
    }
    const inFlight = inFlightSave.current;
    if (inFlight) {
      if (value === inFlight.value) return inFlight.promise;
      return inFlight.promise.then(async () => {
        await flushRef.current(explicit);
      });
    }
    if (value === lastSavedValue.current) return;

    let result: void | Promise<unknown>;
    try {
      result = onSaveRef.current(value);
    } catch (error) {
      result = Promise.reject(error);
    }

    const promise = Promise.resolve(result)
      .then(() => {
        lastSavedValue.current = value;
      })
      .finally(() => {
        if (inFlightSave.current?.promise === promise) {
          inFlightSave.current = null;
        }
      });
    inFlightSave.current = { value, promise };
    return promise;
  };

  useEffect(() => {
    flushRef.current = flush;
  });

  useEffect(
    () =>
      registerSaveBufferFlush(async () => {
        await flushRef.current(true);
      }),
    [],
  );

  useEffect(
    () => () => {
      const pending = pendingCompositionFlush.current;
      if (pending) {
        pendingCompositionFlush.current = null;
        pending.reject(new Error(COMPOSITION_UNMOUNT_ERROR));
      }
      if (isComposing.current) {
        compositionAborted.current = true;
        return;
      }
      const value = latestValue.current;
      if (value === lastSavedValue.current && !inFlightSave.current) return;
      const initial = flushRef.current();
      preserveUnmountSave(initial, () => onSaveRef.current(value));
    },
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    latestValue.current = e.target.value;
    setLocalValue(e.target.value);
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLTextAreaElement>,
  ) => {
    isComposing.current = false;
    latestValue.current = e.currentTarget.value;
    setLocalValue(e.currentTarget.value);
    const pending = pendingCompositionFlush.current;
    pendingCompositionFlush.current = null;
    const result = flush(Boolean(pending), e.currentTarget.value);
    if (!pending) {
      consumeBackgroundFlush(result);
      return;
    }
    void Promise.resolve(result).then(pending.resolve, pending.reject);
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsEditing(true);
    setLocalValue(externalValue);
    latestValue.current = externalValue;
    lastSavedValue.current = externalValue;
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsEditing(false);
    latestValue.current = e.target.value;
    consumeBackgroundFlush(flush());
    props.onBlur?.(e);
  };

  return (
    <textarea
      {...props}
      value={displayedValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
    />
  );
}
