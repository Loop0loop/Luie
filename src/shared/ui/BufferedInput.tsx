import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS } from "@shared/constants";

interface BufferedInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: string;
  onSave: (value: string) => void;
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

  const flush = (value = latestValue.current) => {
    cancelScheduledSave();
    if (value === lastSavedValue.current) return;
    lastSavedValue.current = value;
    onSaveRef.current(value);
  };

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
      cancelScheduledSave();
      if (latestValue.current === lastSavedValue.current) return;
      lastSavedValue.current = latestValue.current;
      onSaveRef.current(latestValue.current);
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
  onSave: (value: string) => void;
}

export function BufferedTextArea({
  value: externalValue,
  onSave,
  ...props
}: BufferedTextAreaProps) {
  const [localValue, setLocalValue] = useState(externalValue);
  const isComposing = useRef(false);
  const [isEditing, setIsEditing] = useState(false);

  const displayedValue = useMemo(() => {
    return isEditing ? localValue : externalValue;
  }, [externalValue, isEditing, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLTextAreaElement>,
  ) => {
    isComposing.current = false;
    setLocalValue(e.currentTarget.value);
    onSave(e.currentTarget.value);
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsEditing(true);
    setLocalValue(externalValue);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsEditing(false);
    onSave(e.target.value);
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
