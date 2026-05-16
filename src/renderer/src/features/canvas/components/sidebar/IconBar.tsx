import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { CANVAS_MODES } from "../../utils/canvasModeRegistry";
import { useCanvasMode } from "../../hooks/useCanvasViewState";
import { useCanvasLayout } from "../../hooks/useCanvasLayout";
import { CANVAS_LAYOUT_PX } from "../../shared/canvasSizing";
import type { CanvasMode } from "../../types/canvas.types";

/**
 * VS Code Activity Bar — 캔버스 도메인 적용. Mode 진입점 세로 레일.
 *
 * 항상 보임. ActivityBar가 접혀 있어도 사용자는 IconBar로 Mode 전환을
 * 계속할 수 있다. 같은 Mode 아이콘을 한 번 더 누르면 ActivityBar가
 * 펼쳐진다(접힘 토글). 다른 Mode를 누르면 Mode 전환 + 자동 펼침.
 *
 * 톤: Editor `Sidebar.tsx` row 패턴 인용.
 *   - active : `bg-active text-fg` + 좌측 `border-l-[3px] border-accent`
 *   - hover  : `hover:bg-surface-hover hover:text-fg`
 *   - disabled: 톤 죽이기 + cursor-not-allowed
 */
export function IconBar() {
  const { t } = useTranslation();
  const { mode, setMode } = useCanvasMode();
  const { isActivityCollapsed, setActivityCollapsed } = useCanvasLayout();

  const handleClick = (next: CanvasMode) => {
    if (next === mode) {
      // 같은 Mode 아이콘 클릭 = ActivityBar 펼침/접힘 토글.
      setActivityCollapsed(!isActivityCollapsed);
      return;
    }
    setMode(next);
    // 다른 Mode로 전환할 때 ActivityBar가 닫혀 있었다면 같이 펼친다.
    if (isActivityCollapsed) setActivityCollapsed(false);
  };

  return (
    <nav
      aria-label={t("canvas.sidebar.activity")}
      className="flex h-full shrink-0 flex-col items-stretch border-r border-border bg-sidebar"
      style={{ width: CANVAS_LAYOUT_PX.ICON_BAR }}
    >
      <ul className="flex flex-col">
        {CANVAS_MODES.map((meta) => {
          const Icon = meta.icon;
          const active = mode === meta.id;
          const label = t(meta.labelKey);
          const disabled = !meta.enabled;
          const title = disabled
            ? `${label} · ${t("canvas.mode.comingSoon")}`
            : active && isActivityCollapsed
              ? `${label} · ${t("canvas.sidebar.expand")}`
              : label;

          return (
            <li key={meta.id}>
              <button
                type="button"
                onClick={disabled ? undefined : () => handleClick(meta.id)}
                disabled={disabled}
                aria-pressed={active}
                aria-label={label}
                title={title}
                className={cn(
                  "relative flex h-11 w-full items-center justify-center transition-colors",
                  "border-l-[3px]",
                  active && !disabled
                    ? "border-accent bg-active text-fg"
                    : "border-transparent",
                  !active &&
                    !disabled &&
                    "text-muted hover:bg-surface-hover hover:text-fg",
                  disabled && "cursor-not-allowed text-muted/40",
                )}
              >
                <Icon
                  className="size-[18px]"
                  strokeWidth={active && !disabled ? 2 : 1.5}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
