import { useMemo, useRef, useState } from "react";

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
  debounceTime = 500,
  ...props
}: BufferedInputProps) {
  const [localValue, setLocalValue] = useState(externalValue);
  const isComposing = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  const displayedValue = useMemo(() => {
    return isEditing ? localValue : externalValue;
  }, [externalValue, isEditing, localValue]);

  const scheduleSave = (value: string) => {
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      onSave(value);
    }, debounceTime);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    if (!isComposing.current) {
      scheduleSave(next);
    }
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
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
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(false);
    onSave(e.target.value);
    props.onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isComposing.current) {
      onSave(localValue);
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
