import type { EditorSettings } from "@shared/types";
import {
  DEFAULT_EDITOR_THEME,
  DEFAULT_EDITOR_THEME_ACCENT,
  DEFAULT_EDITOR_THEME_CONTRAST,
  DEFAULT_EDITOR_THEME_TEMP,
} from "@shared/constants/app/configs";
import { editorSettingsSchema } from "@shared/schemas/index.js";
import { api } from "@shared/api";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import {
  loadCachedThemeSeed,
  saveThemeSeed,
  type ThemeSeed,
} from "@renderer/app/shell/themeSeedCache";

/** 처리되지 않은 Promise rejection이 유실되지 않도록 main logger로 전달한다. */
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
  if (theme.themeAccent?.startsWith("#")) {
    root.setAttribute("data-accent", "custom");
    root.style.setProperty("--text-accent", theme.themeAccent);
    root.style.setProperty("--accent-bg", theme.themeAccent);
    root.style.setProperty("--accent-bg-hover", theme.themeAccent);
  } else {
    root.setAttribute("data-accent", theme.themeAccent || DEFAULT_EDITOR_THEME_ACCENT);
    root.style.removeProperty("--text-accent");
    root.style.removeProperty("--accent-bg");
    root.style.removeProperty("--accent-bg-hover");
  }
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
  setupUnhandledRejectionHandler();
  setupResizeObserverWarningFilter();

  // NOTE: 설정 IPC보다 먼저 그리는 첫 페인트를 지난 세션 테마로 칠한다.
  // 캐시가 없으면(최초 실행) 기본 light 시드가 쓰인다.
  applyThemeSeed(loadCachedThemeSeed() ?? DEFAULT_THEME_SEED);

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
    saveThemeSeed(toThemeSeed(parsed.data));
  } catch {
    // NOTE: setup 실패 시에도 기본 설정은 이미 적용돼 있다.
  }
};
