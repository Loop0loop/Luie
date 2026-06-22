import { useSyncExternalStore } from "react";

/**
 * Returns true after the component has mounted on the client.
 * Use this to avoid hydration mismatches when rendering client-only content.
 *
 * @example
 * const mounted = useMounted();
 * if (!mounted) return <Skeleton />;
 * return <ClientOnlyContent />;
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
