type FontKey = "inter";

const FONT_LOADERS: Record<FontKey, () => Promise<unknown>> = {
  inter: () => import("@renderer/styles/inter-subset.css"),
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

/** startup 비용을 피하려고 사용자가 선택한 경우에만 Inter font를 불러온다. */
export const loadInterFont = (): Promise<void> => {
  return loadFont("inter");
};
