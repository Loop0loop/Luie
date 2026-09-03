import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Minus, Square, X } from "lucide-react";
import { api } from "@shared/api";

const IS_WINDOWS = navigator.userAgent.toLowerCase().includes("win");

const NO_DRAG = { WebkitAppRegion: "no-drag" } as CSSProperties;
const DRAG = { WebkitAppRegion: "drag" } as CSSProperties;

const CONTROL_BUTTON_CLASS =
  "flex w-[46px] items-center justify-center text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-default";

/**
 * Windows 메인 창의 인앱 창 버튼(최소화/최대화/닫기). 메인 창이
 * `titleBarStyle: "hidden"`으로 생성돼 네이티브 타이틀바가 없을 때 macOS traffic
 * lights와 같은 역할을 한다. 보조 창(export/world graph/위저드)은 네이티브
 * 프레임을 유지하므로 이 컴포넌트를 쓰지 않는다.
 *
 * 좌측 투명 밴드는 frameless 창의 이동 확보용 드래그 영역이다. 드래그 영역은
 * pointer 이벤트를 무시하므로(EditorLayout 센티넬 NOTE 참고) 버튼이 놓일 우상단
 * 코너로 폭을 최소화한다.
 */
export function WindowsWindowControls() {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!IS_WINDOWS) return;
    // NOTE: 부분 api mock(dom 테스트)에서도 깨지지 않게 옵셔널로 구독한다(App.tsx 패턴).
    if (typeof api.window?.onMaximizeChanged !== "function") return;
    return api.window.onMaximizeChanged(setIsMaximized);
  }, []);

  if (!IS_WINDOWS) return null;

  const handleToggleMaximize = () => {
    if (isMaximized) {
      void api.window.unmaximize();
      return;
    }
    void api.window.maximize();
  };

  return (
    <div
      className="z-window-controls fixed top-0 right-0 flex h-8 select-none items-stretch"
      style={NO_DRAG}
      data-testid="windows-window-controls"
    >
      <div aria-hidden="true" className="w-24" style={DRAG} />

      <button
        type="button"
        className={CONTROL_BUTTON_CLASS}
        style={NO_DRAG}
        onClick={() => void api.window.minimize()}
        aria-label={t("windowControls.minimize")}
        title={t("windowControls.minimize")}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>

      <button
        type="button"
        className={CONTROL_BUTTON_CLASS}
        style={NO_DRAG}
        onClick={handleToggleMaximize}
        aria-label={isMaximized ? t("windowControls.restore") : t("windowControls.maximize")}
        title={isMaximized ? t("windowControls.restore") : t("windowControls.maximize")}
      >
        {isMaximized ? (
          <Copy className="h-3 w-3 -scale-x-100" strokeWidth={1.5} />
        ) : (
          <Square className="h-3 w-3" strokeWidth={1.5} />
        )}
      </button>

      <button
        type="button"
        className="flex w-[46px] items-center justify-center text-muted transition-colors hover:bg-[#e81123] hover:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-default"
        style={NO_DRAG}
        onClick={() => void api.window.close()}
        aria-label={t("windowControls.close")}
        title={t("windowControls.close")}
      >
        <X className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
