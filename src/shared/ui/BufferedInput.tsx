import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS } from "@shared/constants";
import { registerSaveBufferFlush } from "./saveBufferRegistry";

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
  const flushRef = useRef<() => void | Promise<unknown>>(() => undefined);
  const inFlightSave = useRef<{
    value: string;
    promise: Promise<void>;
  } | null>(null);

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

  const flush = (value = latestValue.current): void | Promise<void> => {
    cancelScheduledSave();
    const inFlight = inFlightSave.current;
    if (inFlight) {
      if (value === inFlight.value) return inFlight.promise;
      return inFlight.promise.then(async () => {
        await flushRef.current();
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
    () => registerSaveBufferFlush(async () => {
      await flushRef.current();
    }),
    [],
  );

  const scheduleSave = (value: string) => {
    latestValue.current = value;
    cancelScheduledSave();
    debounceTimer.current = window.setTimeout(() => {
      debounceTimer.current = null;
      flush(value);
    }, debounceTime);
  };

  useEffect(
    () => () => {
      void flushRef.current();
    },
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
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
    scheduleSave(next);
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
    flush();
    props.onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isComposing.current) {
      flush(localValue);
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
  const flushRef = useRef<() => void | Promise<unknown>>(() => undefined);
  const inFlightSave = useRef<{
    value: string;
    promise: Promise<void>;
  } | null>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const displayedValue = useMemo(() => {
    return isEditing ? localValue : externalValue;
  }, [externalValue, isEditing, localValue]);

  const flush = (value = latestValue.current): void | Promise<void> => {
    if (isComposing.current) return;
    const inFlight = inFlightSave.current;
    if (inFlight) {
      if (value === inFlight.value) return inFlight.promise;
      return inFlight.promise.then(async () => {
        await flushRef.current();
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
    () => registerSaveBufferFlush(async () => {
      await flushRef.current();
    }),
    [],
  );

  useEffect(
    () => () => {
      void flushRef.current();
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
    void flush();
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
    void flush();
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
