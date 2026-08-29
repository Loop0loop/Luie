// @vitest-environment jsdom

import { act, useRef, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { useRestoredPanelSize } from "../../src/renderer/src/features/workspace/hooks/useRestoredPanelSize.js";

/**
 * 항상 mount 상태인 panel(MainLayout의 AI 패널 등)은 `defaultSize`가 갱신되지 않으므로 저장
 * ratio를 panel handle로 직접 적용해야 한다. 그 경로를 검증한다.
 *
 * 폭 기준: group 2500px, minPx 220 => min ratio 8.8%, +60px => 11.2%
 */
const GROUP_WIDTH_PX = 2500;
const MIN_RATIO = (220 / GROUP_WIDTH_PX) * 100; // 8.8
const RAISED_RATIO = (280 / GROUP_WIDTH_PX) * 100; // 11.2
const THIRD_RATIO = (340 / GROUP_WIDTH_PX) * 100; // 13.6

const resizeCalls: string[] = [];

type HarnessProps = { ratio: number; isSettled: boolean };

function Harness({ ratio, isSettled }: HarnessProps): ReactNode {
  const panelRef = useRef<PanelImperativeHandle | null>(null);
  if (panelRef.current === null) {
    panelRef.current = {
      resize: (size: unknown) => {
        resizeCalls.push(String(size));
      },
      collapse: () => {},
      expand: () => {},
      isCollapsed: () => false,
      isExpanded: () => true,
      getId: () => "left-sidebar",
      getSize: () => ({ asPercentage: ratio, inPixels: 0 }),
    } as unknown as PanelImperativeHandle;
  }

  const record = useRestoredPanelSize({
    panelId: "left-sidebar",
    panelIndex: 0,
    panelRef,
    ratio,
    isSettled,
  });

  // group이 보고하는 실제 layout을 그대로 기록한다.
  reportRef.current = (liveRatio: number) => record({ "left-sidebar": liveRatio });
  return null;
}

const reportRef: { current: ((liveRatio: number) => void) | null } = {
  current: null,
};

describe("useRestoredPanelSize serves the last stored width", () => {
  let root: ReturnType<typeof createRoot> | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    resizeCalls.length = 0;
    reportRef.current = null;
  });

  afterEach(() => {
    if (root) act(() => root!.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  const render = async (props: HarnessProps) => {
    if (!container) {
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    }
    await act(async () => {
      root!.render(<Harness {...props} />);
      await Promise.resolve();
    });
  };

  it("applies the stored ratio that arrives after mount", async () => {
    // 사이드바가 min으로 mount된 상태.
    await render({ ratio: MIN_RATIO, isSettled: true });
    await act(async () => {
      reportRef.current?.(MIN_RATIO);
    });
    resizeCalls.length = 0;

    // 저장 ratio가 +60px로 바뀐다(다른 창에서 조정 후 복원 등).
    await render({ ratio: RAISED_RATIO, isSettled: true });

    expect(resizeCalls).toContain(`${Number(RAISED_RATIO.toFixed(3))}%`);
  });

  it("applies min again after the width was raised (user scenario)", async () => {
    await render({ ratio: RAISED_RATIO, isSettled: true });
    await act(async () => {
      reportRef.current?.(RAISED_RATIO);
    });
    resizeCalls.length = 0;

    // 사용자가 min으로 되돌렸고 그 값이 저장됐다. 이전 값(+60px)이 아니라 min이 적용돼야 한다.
    await render({ ratio: MIN_RATIO, isSettled: true });

    expect(resizeCalls).toContain(`${Number(MIN_RATIO.toFixed(3))}%`);
    expect(resizeCalls).not.toContain(`${Number(RAISED_RATIO.toFixed(3))}%`);
  });

  it("does not touch the panel while it is animating", async () => {
    await render({ ratio: MIN_RATIO, isSettled: false });

    expect(resizeCalls).toEqual([]);
  });

  it("never applies a stored ratio mid-gesture", async () => {
    await render({ ratio: MIN_RATIO, isSettled: true });
    await act(async () => {
      reportRef.current?.(MIN_RATIO);
    });
    resizeCalls.length = 0;

    // 사용자가 handle을 잡고 드래그하는 중. useLayoutPersist가 멈춤마다 ratio를 커밋하므로
    // 그 값으로 패널을 되돌리면 특정 px에 고정된 것처럼 보인다.
    await act(async () => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    await render({ ratio: RAISED_RATIO, isSettled: true });
    expect(resizeCalls).toEqual([]);

    // 손을 뗀 뒤 ratio가 또 바뀌면 정상적으로 적용된다.
    await act(async () => {
      window.dispatchEvent(new Event("pointerup"));
    });
    await render({ ratio: THIRD_RATIO, isSettled: true });
    expect(resizeCalls).toContain(`${Number(THIRD_RATIO.toFixed(3))}%`);
  });
});
