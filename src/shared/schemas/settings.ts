import { z } from "zod";

const editorSettingsShape = z.strictObject({
  fontFamily: z.union([z.enum(["system-ui", "serif", "mono"]), z.string()]),
  fontPreset: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const legacyPresets = [
        "lora",
        "bitter",
        "source-serif",
        "montserrat",
        "nunito-sans",
        "victor-mono",
      ];
      if (legacyPresets.includes(val)) {
        return undefined;
      }
      return val === "inter" ? "inter" : undefined;
    })
    .pipe(z.enum(["inter"]).optional()),
  customFontFamily: z.string().max(200).optional(),
  fontSize: z.number().int().positive(),
  lineHeight: z.number().positive(),
  letterSpacing: z.number().min(0).max(0.3).optional().default(0.05),
  wordSpacing: z.number().min(0).max(0.2).optional().default(0.06),
  paragraphSpacing: z.number().min(0).max(3).optional().default(1.0),
  maxWidth: z.number().int().positive(),
  spellcheckEnabled: z.boolean().optional().default(true),
  theme: z.enum(["light", "dark", "sepia"]),
  themeContrast: z.enum(["soft", "high"]).optional().default("soft"),
  themeTemp: z.enum(["cool", "neutral", "warm"]).catch("neutral"),
  themeAccent: z
    .enum(["blue", "violet", "green", "amber", "rose", "slate"])
    .optional()
    .default("blue"),
  uiMode: z
    .enum(["default", "docs", "editor", "word", "scrivener"])
    .transform((v) => (v === "word" ? "editor" : v))
    .pipe(z.enum(["default", "docs", "editor", "scrivener"]))
    .catch("default"),
  enableAnimations: z.boolean().optional().default(true),
  entityColors: z.object({
    character: z.string(),
    event: z.string(),
    faction: z.string(),
    term: z.string(),
  }).optional(),
});

// Legacy stored settings may still include removed themeTemp/themeTexture keys.
export const editorSettingsSchema = z.preprocess((value) => {
  if (value && typeof value === "object") {
    const next = { ...(value as Record<string, unknown>) };
    delete next.themeTexture;
    return next;
  }
  return value;
}, editorSettingsShape);

export const settingsAutoSaveSchema = z.strictObject({
  enabled: z.boolean().optional(),
  interval: z.number().int().positive().optional(),
});

export const settingsLanguageSchema = z.strictObject({
  language: z.enum(["ko", "en", "ja"]),
});

export const settingsMenuBarModeSchema = z.strictObject({
  mode: z.enum(["hidden", "visible"]),
});

export const settingsShortcutsSchema = z.strictObject({
  shortcuts: z.record(z.string(), z.string()),
});

export const windowBoundsSchema = z.strictObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  x: z.number().int(),
  y: z.number().int(),
});

export const settingsOllamaConfigSchema = z.strictObject({
  baseUrl: z
    .string()
    .min(1)
    .max(1024)
    .refine((value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }, "Ollama baseUrl must be a valid http(s) URL"),
  chatModel: z.string().min(1).max(200),
  embeddingModel: z.string().min(1).max(200).optional(),
  apiKey: z.string().min(1).max(2048).optional(),
});

export const settingsLlmPreferenceSchema = z.strictObject({
  provider: z.enum(["auto", "sidecar", "ollama", "openai", "gemini"]),
});

export const settingsSearchOptimizationModeSchema = z.strictObject({
  mode: z.enum(["low-end", "standard", "high-end", "quality"]),
});

export const settingsLocalLlmSchema = z.strictObject({
  enabled: z.boolean(),
  modelPath: z.string().min(1).max(4096).optional(),
  binaryPath: z.string().min(1).max(4096).optional(),
  gpuLayers: z.number().int().optional(),
  contextSize: z.number().int().positive().optional(),
  cacheRamMiB: z.number().int().positive().optional(),
  cacheReuse: z.number().int().nonnegative().optional(),
});
export const settingsLlmKeysSchema = z.strictObject({
  openaiApiKey: z.string().max(2048),
  geminiApiKey: z.string().max(2048),
});
