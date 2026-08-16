import { useSyncExternalStore } from "react";

/** 첫 client mount 이후에만 true를 반환해 client 전용 content의 hydration 불일치를 막는다. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
