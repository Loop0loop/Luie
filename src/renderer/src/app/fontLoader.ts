type FontKey = "inter";

const FONT_LOADERS: Record<FontKey, () => Promise<unknown>> = {
  inter: () => import("@fontsource-variable/inter/index.css"),
};

const loadedFonts = new Set<FontKey>();
const pendingFonts = new Map<FontKey, Promise<void>>();

const loadFont = (fontKey: FontKey): Promise<void> => {
  if (loadedFonts.has(fontKey)) {
    return Promise.resolve();
  }

  const pending = pendingFonts.get(fontKey);
  if (pending) {
    return pending;
  }

  const nextPromise = FONT_LOADERS[fontKey]()
    .then(() => {
      loadedFonts.add(fontKey);
    })
    .finally(() => {
      pendingFonts.delete(fontKey);
    });

  pendingFonts.set(fontKey, nextPromise);
  return nextPromise;
};

/**
 * Load Inter font on demand when user selects it as optional preset.
 * System fonts are the default, so no fonts auto-load on startup.
 */
export const loadInterFont = (): Promise<void> => {
  return loadFont("inter");
};
