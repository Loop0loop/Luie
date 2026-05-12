import { useState, useEffect } from "react";

export interface SystemFont {
  family: string;
  fullName: string;
}

interface UseSystemFontsResult {
  fonts: SystemFont[];
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
}

const isSupported =
  typeof window !== "undefined" && "queryLocalFonts" in window;

let fontCache: SystemFont[] | null = null;
let loadPromise: Promise<SystemFont[]> | null = null;

async function loadSystemFonts(): Promise<SystemFont[]> {
  if (fontCache) return fontCache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (!isSupported || !window.queryLocalFonts) return [];

    const localFonts = await window.queryLocalFonts();
    const uniqueFamilies = new Map<string, SystemFont>();

    for (const font of localFonts) {
      if (!uniqueFamilies.has(font.family)) {
        uniqueFamilies.set(font.family, {
          family: font.family,
          fullName: font.fullName,
        });
      }
    }

    fontCache = Array.from(uniqueFamilies.values()).sort((a, b) =>
      a.family.localeCompare(b.family),
    );
    return fontCache;
  })();

  return loadPromise;
}

export function useSystemFonts(): UseSystemFontsResult {
  const [fonts, setFonts] = useState<SystemFont[]>(fontCache ?? []);
  const [isLoading, setIsLoading] = useState(fontCache === null && isSupported);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported) return;
    if (fontCache) {
      setFonts(fontCache);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadSystemFonts()
      .then((result) => {
        setFonts(result);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load system fonts");
        setFonts([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return { fonts, isLoading, error, isSupported };
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<
      Array<{
        family: string;
        fullName: string;
        postscriptName: string;
        style: string;
      }>
    >;
  }
}
