import { app, screen } from "electron";
import { windowManager } from "../../../app/windows/index.js";
import { applyTrafficLightPosition } from "../../../manager/window/windowChrome.js";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../../core/ipcRegistrar.js";
import type { LoggerLike } from "../../core/types.js";
import { ServiceError } from "../../../utils/error/index.js";
import { ErrorCode } from "../../../../shared/constants/errors/index.js";
import {
  ensureBootstrapReady,
  getBootstrapStatus,
} from "../../../lifecycle/bootstrap/index.js";
import { appUpdateService } from "../../../app/startup/index.js";
import {
  windowOpenExportArgsSchema,
  windowSetFullscreenArgsSchema,
  windowSetStartupWizardSizeArgsSchema,
  windowSetTrafficLightVisibilityArgsSchema,
} from "../../../../shared/schemas/index.js";
import type { BrowserWindow } from "electron";

// 위저드 단계 전환(A 인트로 → B 테마)의 창 확장 애니메이션. 창이 커지는 동안 내용물이
// 재배치되는 걸 따라갈 수 있도록 여유 있는 길이로 보간하고(easeOutCubic), 프레임마다
// 시작 중심점 기준으로 bounds를 잡아 폭이 커질 때 창이 한쪽으로 늘어나 보이지 않게 한다.
const WIZARD_RESIZE_ANIMATION_MS = 800;
const WIZARD_RESIZE_TICK_MS = 16;

let wizardResizeTimer: ReturnType<typeof setTimeout> | null = null;

// 디스플레이 작업 영역(workArea) 내에서 대상 영역을 계산한다.
// 최대 크기(workArea 이상)를 요청하면 여백 없이 workArea 전체를 꽉 채우고,
// 가로형(1300×800) 등 일반 크기는 workArea 내 중앙 정렬한다.
const getTargetWizardBounds = (
  win: BrowserWindow,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } => {
  const workArea = screen.getDisplayMatching(win.getBounds()).workArea;
  const clampedWidth = Math.min(width, workArea.width);
  const clampedHeight = Math.min(height, workArea.height);

  if (width >= workArea.width && height >= workArea.height) {
    return {
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height,
    };
  }

  return {
    x: Math.round(workArea.x + (workArea.width - clampedWidth) / 2),
    y: Math.round(workArea.y + (workArea.height - clampedHeight) / 2),
    width: clampedWidth,
    height: clampedHeight,
  };
};

const animateWizardResize = (
  win: BrowserWindow,
  target: { x: number; y: number; width: number; height: number },
): void => {
  if (wizardResizeTimer) clearTimeout(wizardResizeTimer);

  const [startWidth, startHeight] = win.getSize();
  const [startX, startY] = win.getPosition();
  const startedAt = Date.now();

  const tick = () => {
    const progress = Math.min(
      1,
      (Date.now() - startedAt) / WIZARD_RESIZE_ANIMATION_MS,
    );
    const eased = 1 - Math.pow(1 - progress, 3);
    const width = Math.round(startWidth + (target.width - startWidth) * eased);
    const height = Math.round(
      startHeight + (target.height - startHeight) * eased,
    );
    const x = Math.round(startX + (target.x - startX) * eased);
    const y = Math.round(startY + (target.y - startY) * eased);

    win.setBounds({
      x,
      y,
      width,
      height,
    });

    if (progress < 1) {
      wizardResizeTimer = setTimeout(tick, WIZARD_RESIZE_TICK_MS);
    } else {
      wizardResizeTimer = null;
    }
  };
  tick();
};

export function registerWindowIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.WINDOW_CLOSE,
      logTag: "WINDOW_CLOSE",
      failMessage: "Failed to close window",
      handler: () => {
        logger.info("WINDOW_CLOSE requested from renderer");
        const win = windowManager.getMainWindow();
        if (!win) return false;
        win.close();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.APP_QUIT,
      logTag: "APP_QUIT",
      failMessage: "Failed to quit app",
      handler: () => {
        logger.info("APP_QUIT requested from renderer");
        app.quit();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.APP_GET_VERSION,
      logTag: "APP_GET_VERSION",
      failMessage: "Failed to get app version",
      handler: () => ({
        version: app.getVersion(),
      }),
    },
    {
      channel: IPC_CHANNELS.APP_CHECK_UPDATE,
      logTag: "APP_CHECK_UPDATE",
      failMessage: "Failed to check app update",
      handler: async () => appUpdateService.checkForUpdate(),
    },
    {
      channel: IPC_CHANNELS.APP_GET_UPDATE_STATE,
      logTag: "APP_GET_UPDATE_STATE",
      failMessage: "Failed to get app update state",
      handler: async () => appUpdateService.getState(),
    },
    {
      channel: IPC_CHANNELS.APP_DOWNLOAD_UPDATE,
      logTag: "APP_DOWNLOAD_UPDATE",
      failMessage: "Failed to download app update",
      handler: async () => appUpdateService.downloadUpdate(),
    },
    {
      channel: IPC_CHANNELS.APP_APPLY_UPDATE,
      logTag: "APP_APPLY_UPDATE",
      failMessage: "Failed to apply app update",
      handler: async () => appUpdateService.applyUpdate(),
    },
    {
      channel: IPC_CHANNELS.APP_ROLLBACK_UPDATE,
      logTag: "APP_ROLLBACK_UPDATE",
      failMessage: "Failed to rollback app update",
      handler: async () => appUpdateService.rollbackUpdate(),
    },
    {
      channel: IPC_CHANNELS.APP_GET_BOOTSTRAP_STATUS,
      logTag: "APP_GET_BOOTSTRAP_STATUS",
      failMessage: "Failed to get bootstrap status",
      handler: () => {
        void ensureBootstrapReady();
        return getBootstrapStatus();
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_MAXIMIZE,
      logTag: "WINDOW_MAXIMIZE",
      failMessage: "Failed to maximize window",
      handler: () => {
        const win = windowManager.getMainWindow();
        if (!win) return false;
        if (!win.isMaximized()) {
          win.maximize();
        }
        win.focus();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_TOGGLE_FULLSCREEN,
      logTag: "WINDOW_TOGGLE_FULLSCREEN",
      failMessage: "Failed to toggle fullscreen",
      handler: () => {
        const win = windowManager.getMainWindow();
        if (!win) return false;
        if (process.platform === "darwin") {
          win.setSimpleFullScreen(!win.isSimpleFullScreen());
        } else {
          win.setFullScreen(!win.isFullScreen());
        }
        win.focus();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_SET_FULLSCREEN,
      logTag: "WINDOW_SET_FULLSCREEN",
      failMessage: "Failed to set fullscreen",
      argsSchema: windowSetFullscreenArgsSchema,
      handler: (flag: boolean) => {
        const win = windowManager.getMainWindow();
        if (!win) return false;
        if (process.platform === "darwin") {
          // NOTE: macOS는 별도 Space 생성을 피하려고 simple fullscreen을 사용한다.
          win.setSimpleFullScreen(flag);
        } else {
          win.setFullScreen(flag);
        }
        win.focus();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY,
      logTag: "WINDOW_SET_TRAFFIC_LIGHT_VISIBILITY",
      failMessage: "Failed to set traffic light visibility",
      argsSchema: windowSetTrafficLightVisibilityArgsSchema,
      handler: (visible: boolean) => {
        // NOTE: setWindowButtonVisibility는 macOS 전용 API다(Electron BrowserWindow 문서).
        // 다른 플랫폼에서는 트래픽 라이트 개념이 없어 no-op으로 응답한다.
        if (process.platform !== "darwin") return false;
        const win = windowManager.getMainWindow();
        if (!win) return false;
        win.setWindowButtonVisibility(visible);
        // NOTE: 가시성 토글은 생성 시 trafficLightPosition을 무효화한다. 좌표를 다시
        // 적용하지 않으면 hover로 버튼이 돌아올 때마다 기본 위치로 어긋난다.
        applyTrafficLightPosition(win);
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_OPEN_EXPORT,
      logTag: "WINDOW_OPEN_EXPORT",
      failMessage: "Failed to open export window",
      argsSchema: windowOpenExportArgsSchema,
      handler: (chapterId: string) => {
        if (!chapterId) {
          logger.error("Invalid chapterId for export", {
            chapterId,
            type: typeof chapterId,
          });
          throw new ServiceError(
            ErrorCode.REQUIRED_FIELD_MISSING,
            "Chapter ID is required to open export window",
            { chapterId, receivedType: typeof chapterId },
          );
        }

        windowManager.createExportWindow(chapterId);
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_OPEN_WORLD_GRAPH,
      logTag: "WINDOW_OPEN_WORLD_GRAPH",
      failMessage: "Failed to open world graph window",
      handler: () => {
        windowManager.createWorldGraphWindow();
        return true;
      },
    },
    {
      channel: IPC_CHANNELS.WINDOW_SET_STARTUP_WIZARD_SIZE,
      logTag: "WINDOW_SET_STARTUP_WIZARD_SIZE",
      failMessage: "Failed to resize startup wizard window",
      argsSchema: windowSetStartupWizardSizeArgsSchema,
      handler: (width: number, height: number, animate: boolean) => {
        // NOTE: 위저드 단계 전환(A 인트로 → B 테마)에 맞춘 리사이즈다. 메인 창이
        // 아니라 위저드 창을 움직여야 하므로 전용 접근자를 쓴다. 애니메이션은
        // renderer의 enableAnimations(및 OS reduced-motion) 판정을 그대로 받는다.
        const win = windowManager.getStartupWizardWindow();
        if (!win) return false;
        const targetBounds = getTargetWizardBounds(win, width, height);
        if (!animate) {
          if (wizardResizeTimer) {
            clearTimeout(wizardResizeTimer);
            wizardResizeTimer = null;
          }
          win.setBounds(targetBounds);
          return true;
        }
        animateWizardResize(win, targetBounds);
        return true;
      },
    },
  ]);
}
