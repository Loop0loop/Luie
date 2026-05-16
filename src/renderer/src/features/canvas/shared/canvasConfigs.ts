/**
 * Canvas-feature interaction timings / config.
 *
 * 외부 `@shared/constants/configs.ts` 패턴을 인용하되 캔버스가 자체 값으로
 * 격리해 둔다. 워크스페이스 사이드바와 캔버스 사이드바는 인터랙션 톤이
 * 같지 않을 수 있으므로 별도 값으로 둔다(필요하면 캔버스만 따로 튜닝).
 */

/** Resize commit debounce interval. ms 단위. */
export const CANVAS_SURFACE_RESIZE_COMMIT_IDLE_MS = 140;
