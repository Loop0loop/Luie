import type { EditorSettings } from "@shared/types";
import {
  DEFAULT_EDITOR_THEME,
  DEFAULT_EDITOR_THEME_ACCENT,
  DEFAULT_EDITOR_THEME_CONTRAST,
  DEFAULT_EDITOR_THEME_TEMP,
} from "@shared/constants/app/configs";
import { editorSettingsSchema } from "@shared/schemas/index.js";
import { api } from "@shared/api";
import { useEditorStore } from "@renderer/domains/editor";

/**
 * Register a global unhandledrejection listener so that Promise rejections
 * that are not caught anywhere are at least logged to the main process instead
 * of silently disappearing. This runs once when the renderer boots.
 */
function setupUnhandledRejectionHandler(): void {
  window.addEventListener(
    "unhandledrejection",
    (event: PromiseRejectionEvent) => {
      const reason = event.reason as unknown;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unknown unhandled rejection";

      api?.logger?.error("[renderer] Unhandled Promise rejection", {
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
      });

      if (import.meta.env.DEV) {
        void api?.logger?.warn?.(
          "[renderer] Unhandled Promise rejection (dev)",
          {
            reason:
              reason instanceof Error
                ? { message: reason.message, stack: reason.stack }
                : reason,
          },
        );
      }
    },
  );
}

const isResizeObserverNoise = (message: string): boolean =>
  message.includes("ResizeObserver loop completed with undelivered notifications") ||
  message.includes("ResizeObserver loop limit exceeded");

function setupResizeObserverWarningFilter(): void {
  window.addEventListener(
    "error",
    (event) => {
      const errorEvent = event as ErrorEvent;
      if (
        typeof errorEvent.message === "string" &&
        isResizeObserverNoise(errorEvent.message)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}

type ThemeSeed = Pick<
  EditorSettings,
  | "theme"
  | "themeContrast"
  | "themeTemp"
  | "themeAccent"
  | "enableAnimations"
>;

const DEFAULT_THEME_SEED: ThemeSeed = {
  theme: DEFAULT_EDITOR_THEME,
  themeContrast: DEFAULT_EDITOR_THEME_CONTRAST,
  themeTemp: DEFAULT_EDITOR_THEME_TEMP,
  themeAccent: DEFAULT_EDITOR_THEME_ACCENT,
  enableAnimations: true,
};

const applyThemeSeed = (theme: ThemeSeed): void => {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.theme);
  root.setAttribute("data-contrast", theme.themeContrast);
  root.setAttribute("data-temp", theme.themeTemp);
  root.setAttribute("data-accent", theme.themeAccent);
  root.setAttribute(
    "data-animations",
    theme.enableAnimations ? "on" : "off",
  );
};

const toThemeSeed = (settings: EditorSettings): ThemeSeed => ({
  theme: settings.theme,
  themeContrast: settings.themeContrast,
  themeTemp: settings.themeTemp,
  themeAccent: settings.themeAccent,
  enableAnimations: settings.enableAnimations,
});

export const setupRenderer = async (): Promise<void> => {
  // ✅ Register global rejection handler before anything else
  setupUnhandledRejectionHandler();
  setupResizeObserverWarningFilter();

  applyThemeSeed(DEFAULT_THEME_SEED);

  try {
    const response = await api.settings.getEditor();
    if (!response.success || !response.data) {
      return;
    }

    const parsed = editorSettingsSchema.safeParse(response.data);
    if (!parsed.success) {
      return;
    }

    useEditorStore.setState(parsed.data);
    applyThemeSeed(toThemeSeed(parsed.data));
  } catch {
    // Best-effort setup: defaults are already applied.
  }
};
