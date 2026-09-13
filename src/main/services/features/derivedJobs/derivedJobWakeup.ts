let wakeupListener: (() => void) | null = null;

export function setDerivedJobWakeupListener(listener: () => void): void {
  wakeupListener = listener;
}

export function requestDerivedJobWakeup(): void {
  wakeupListener?.();
}
