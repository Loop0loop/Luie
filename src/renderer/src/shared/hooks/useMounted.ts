import { useState, useEffect } from "react";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
