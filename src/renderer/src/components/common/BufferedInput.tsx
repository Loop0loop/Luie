import { useEffect, useState, useRef } from "react";

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

  useEffect(() => {
    // Only sync from external if we are NOT currently typing/composing
    // and if the values are truly different
    if (!isComposing.current && externalValue !== localValue) {
      setLocalValue(externalValue);
    }
  }, [externalValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLInputElement>,
  ) => {
    isComposing.current = false;
    // Trigger save immediately after composition ends if you want "live-ish" updates
    // or wait for blur. Here we update local value.
    setLocalValue(e.currentTarget.value);
    onSave(e.currentTarget.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
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
      value={localValue}
      onChange={handleChange}
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

  useEffect(() => {
    if (!isComposing.current && externalValue !== localValue) {
      setLocalValue(externalValue);
    }
  }, [externalValue]);

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

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    onSave(e.target.value);
    props.onBlur?.(e);
  };

  return (
    <textarea
      {...props}
      value={localValue}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
    />
  );
}
