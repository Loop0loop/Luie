import {
  screen,
  systemPreferences,
  type BrowserWindow,
  type Rectangle,
} from "electron";
import {
  calculateStartupWizardExpandedBounds,
  calculateStartupWizardInitialBounds,
} from "./windowStartupWizard.js";

// ponytail: Windows OS 보간 미지원. 200ms/최대 13회는 작업 예산이며 실기 trace 후 조정한다.
const WINDOWS_RESIZE_DURATION_MS = 200;
const WINDOWS_RESIZE_INTERVAL_MS = 16;
const WINDOWS_RESIZE_MAX_STEPS = Math.ceil(
  WINDOWS_RESIZE_DURATION_MS / WINDOWS_RESIZE_INTERVAL_MS,
);
// macOS 완료 이벤트 누락에만 쓰는 안전 상한이며 애니메이션 길이가 아니다.
const NATIVE_RESIZE_FALLBACK_MS = 2_000;
const pendingResizes = new WeakMap<BrowserWindow, () => void>();

const sameBounds = (a: Rectangle, b: Rectangle): boolean =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

// 디스플레이 작업 영역(workArea) 내에서 대상 영역을 계산한다.
// 1. 음수 크기(-1, -1 등): A 인트로/모델 단계의 초기 콤팩트 bounds로 복원
// 2. 최대 크기(4000 이상 또는 workArea 이상): 여백 없이 workArea 100% 채움
// 3. 가로형 확장 프리뷰(1200 이상): 화면 82% 비율 + clamp 기반 동적 bounds 적용
// 4. 기타 크기: workArea 내 중앙 정렬
const getTargetWizardBounds = (
  win: BrowserWindow,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } => {
  if (width < 0 || height < 0) {
    const initial = calculateStartupWizardInitialBounds(win);
    return {
      x: initial.x,
      y: initial.y,
      width: initial.width,
      height: initial.height,
    };
  }

  const workArea = screen.getDisplayMatching(win.getBounds()).workArea;

  if (width >= 4000 || (width >= workArea.width && height >= workArea.height)) {
    return {
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height,
    };
  }

  if (width >= 1200 || (width === 0 && height === 0)) {
    return calculateStartupWizardExpandedBounds(win);
  }

  const clampedWidth = Math.min(width, workArea.width);
  const clampedHeight = Math.min(height, workArea.height);

  return {
    x: Math.round(workArea.x + (workArea.width - clampedWidth) / 2),
    y: Math.round(workArea.y + (workArea.height - clampedHeight) / 2),
    width: clampedWidth,
    height: clampedHeight,
  };
};

/** 위저드 전용 전환. 완료는 프리뷰 마운트 허용 시점이며 OS paint 완료 보장은 아니다. */
export function resizeStartupWizardWindow(
  win: BrowserWindow | null,
  width: number,
  height: number,
  animate: boolean,
  logger: { debug: (message: string) => void },
): boolean | Promise<boolean> {
  if (!win || win.isDestroyed()) return false;
  const cancelPrevious = pendingResizes.get(win);
  cancelPrevious?.();
  const target = getTargetWizardBounds(win, width, height);
  const start = win.getBounds();
  if (!cancelPrevious && sameBounds(start, target)) return true;

  const supported =
    process.platform === "darwin" || process.platform === "win32";
  const motion =
    animate && supported ? systemPreferences.getAnimationSettings() : null;
  if (
    !motion ||
    motion.prefersReducedMotion ||
    !motion.shouldRenderRichAnimation
  ) {
    win.setBounds(target, false);
    return true;
  }

  const nativeAnimate = process.platform === "darwin";
  return new Promise<boolean>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (success: boolean, error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      win.removeListener("resized", onResized);
      win.removeListener("closed", onClosed);
      pendingResizes.delete(win);
      if (error) reject(error);
      else resolve(success);
    };
    const onResized = () => finish(true);
    const onClosed = () => finish(false);
    pendingResizes.set(win, onClosed);
    win.once("closed", onClosed);

    if (nativeAnimate) {
      timer = setTimeout(() => {
        logger.debug("Wizard resize completion fallback");
        try {
          if (win.isDestroyed()) return finish(false);
          win.setBounds(target, false);
          finish(true);
        } catch (error) {
          finish(false, error);
        }
      }, NATIVE_RESIZE_FALLBACK_MS);
      win.once("resized", onResized);
      try {
        win.setBounds(target, true);
      } catch (error) {
        finish(false, error);
      }
      return;
    }

    const startedAt = performance.now();
    let steps = 0;
    let last = start;
    const tick = () => {
      if (settled) return;
      if (win.isDestroyed()) return finish(false);
      const elapsed = performance.now() - startedAt;
      const progress =
        ++steps >= WINDOWS_RESIZE_MAX_STEPS
          ? 1
          : Math.min(1, elapsed / WINDOWS_RESIZE_DURATION_MS);
      const eased = 1 - (1 - progress) ** 3;
      const next =
        progress === 1
          ? target
          : {
              x: Math.round(start.x + (target.x - start.x) * eased),
              y: Math.round(start.y + (target.y - start.y) * eased),
              width: Math.round(
                start.width + (target.width - start.width) * eased,
              ),
              height: Math.round(
                start.height + (target.height - start.height) * eased,
              ),
            };
      try {
        if (!sameBounds(last, next)) {
          win.setBounds(next, false);
          last = next;
        }
      } catch (error) {
        finish(false, error);
        return;
      }
      // setBounds 중 closed 등으로 취소됐어도 다음 타이머가 다시 생기면 안 된다.
      if (settled) return;
      if (progress === 1) return finish(true);
      // 이전 프레임을 따라잡지 않는다. native 호출 비용도 다음 지연 계산에 포함한다.
      timer = setTimeout(
        tick,
        Math.min(
          WINDOWS_RESIZE_INTERVAL_MS,
          Math.max(
            1,
            WINDOWS_RESIZE_DURATION_MS - (performance.now() - startedAt),
          ),
        ),
      );
    };
    timer = setTimeout(tick, WINDOWS_RESIZE_INTERVAL_MS);
  });
}
