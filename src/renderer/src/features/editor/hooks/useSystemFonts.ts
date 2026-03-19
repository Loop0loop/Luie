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

export function useSystemFonts(): UseSystemFontsResult {
  const [fonts, setFonts] = useState<SystemFont[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof window !== "undefined" && "queryLocalFonts" in window;

  useEffect(() => {
    async function loadFonts() {
      setIsLoading(true);
      setError(null);

      try {
        if (isSupported && window.queryLocalFonts) {
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

          setFonts(
            Array.from(uniqueFamilies.values()).sort((a, b) =>
              a.family.localeCompare(b.family),
            ),
          );
        } else {
          setFonts([]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load system fonts",
        );
        setFonts([]);
      } finally {
        setIsLoading(false);
      }
    }

    void loadFonts();
  }, [isSupported]);

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
