import { useTranslation } from "react-i18next";
import { cn } from "@renderer/lib/utils";
import {
  CANVAS_SCOPE_PRESETS,
  CANVAS_SECTION_KEYS,
} from "../shared/constants";
import { useCanvasUiStore } from "../store/canvasUiStore";
import type { CanvasScope } from "../types";
import { SidebarSection } from "./SidebarSection";

function isSameScope(a: CanvasScope, b: CanvasScope): boolean {
  if (a.kind !== b.kind) return false;
  return (
    a.episode === b.episode &&
    a.fromEpisode === b.fromEpisode &&
    a.toEpisode === b.toEpisode
  );
}

function useDescribeScope(): (scope: CanvasScope) => string {
  const { t } = useTranslation();

  return (scope) => {
    switch (scope.kind) {
      case "current-episode":
        return scope.episode !== undefined
          ? t("canvas.sidebar.scope.describe.currentEpisode", {
              episode: scope.episode,
            })
          : t("canvas.sidebar.scope.preset.currentEpisode");
      case "episode-range":
        return scope.fromEpisode !== undefined && scope.toEpisode !== undefined
          ? t("canvas.sidebar.scope.describe.episodeRange", {
              from: scope.fromEpisode,
              to: scope.toEpisode,
            })
          : t("canvas.sidebar.scope.describe.none");
      case "all":
        return t("canvas.sidebar.scope.describe.all");
    }
  };
}

/**
 * Scope: 캔버스가 보여줄 범위를 고른다.
 * 현재 활성 프리셋은 accent dot으로 강조.
 */
export function ScopeSelector() {
  const { t } = useTranslation();
  const scope = useCanvasUiStore((s) => s.scope);
  const setScope = useCanvasUiStore((s) => s.setScope);
  const describeScope = useDescribeScope();

  return (
    <SidebarSection title={t(CANVAS_SECTION_KEYS.scope)}>
      <div className="flex flex-col gap-1.5 px-1">
        <p className="text-[11px] leading-snug text-muted">
          <span>{t("canvas.sidebar.scope.currentLabel")}</span>
          <span className="mx-1 opacity-40">·</span>
          <span className="text-fg/90">{describeScope(scope)}</span>
        </p>
        <div className="flex flex-wrap gap-1">
          {CANVAS_SCOPE_PRESETS.map((preset) => {
            const active = isSameScope(scope, preset.scope);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setScope(preset.scope)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-6 items-center rounded-sm px-2 text-[11px] transition-colors",
                  active
                    ? "bg-active text-fg"
                    : "text-muted hover:bg-surface-hover hover:text-fg",
                )}
              >
                {t(preset.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </SidebarSection>
  );
}
