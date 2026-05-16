import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";
import { groupLayoutMatchesPanels } from "../utils/panelGroupLayout";

/**
 * 외부 `features/workspace/hooks/useFixedPixelPanelGroupLayout.ts`를 캔버스
 * 안으로 인용. PanelGroup이 px 기반 폭(고정 패널) + 비율 기반 폭(가변 패널)을
 * 함께 가질 때, 컨테이너 폭이 측정된 다음 layout을 한 번 setLayout해 준다.
 *
 * 워크스페이스 hook과의 차이:
 *   - `beginLayoutRestoring` 같은 글로벌 DOM 마커 의존 제거. 캔버스 자체
 *     `isLayoutReady`만으로 깜빡임을 방지한다.
 *   - 다른 모든 동작/시그니처는 동일.
 */

type FixedPanelSpec = {
  id: string;
  widthPx: number;
  minPx: number;
  maxPx: number;
  /** true면 widthPx 무시하고 0%로 collapse. */
  collapsed?: boolean;
};

type Options = {
  containerRef: MutableRefObject<HTMLElement | null>;
  groupRef: MutableRefObject<GroupImperativeHandle | null>;
  fixedPanels: FixedPanelSpec[];
  flexPanelId: string;
  flexPanelMinPercent: number;
};

interface Result {
  isLayoutReady: boolean;
}

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundPercent = (value: number): number =>
  Number(clampNumber(value, 0, 100).toFixed(3));

const buildLayout = ({
  containerWidth,
  fixedPanels,
  flexPanelId,
  flexPanelMinPercent,
}: {
  containerWidth: number;
  fixedPanels: FixedPanelSpec[];
  flexPanelId: string;
  flexPanelMinPercent: number;
}): Record<string, number> | null => {
  if (containerWidth <= 0) return null;

  const layout: Record<string, number> = {};
  const maxFixedPercent = Math.max(0, 100 - flexPanelMinPercent);

  const requestedPercents = fixedPanels.map((panel) => {
    const widthPx = panel.collapsed
      ? 0
      : clampNumber(panel.widthPx, panel.minPx, panel.maxPx);
    return {
      id: panel.id,
      percent: roundPercent((widthPx / containerWidth) * 100),
    };
  });

  const requestedTotal = requestedPercents.reduce(
    (sum, p) => sum + p.percent,
    0,
  );
  const scale =
    requestedTotal > maxFixedPercent && requestedTotal > 0
      ? maxFixedPercent / requestedTotal
      : 1;

  let fixedTotal = 0;
  requestedPercents.forEach((panel) => {
    const percent = roundPercent(panel.percent * scale);
    layout[panel.id] = percent;
    fixedTotal += percent;
  });

  layout[flexPanelId] = roundPercent(
    Math.max(flexPanelMinPercent, 100 - fixedTotal),
  );
  return layout;
};

const layoutSignature = (layout: Record<string, number> | null): string | null =>
  layout ? JSON.stringify(layout) : null;

const cancelFrame = (frameId: number | null): null => {
  if (frameId !== null) cancelAnimationFrame(frameId);
  return null;
};

export function useCanvasPanelGroupLayout({
  containerRef,
  groupRef,
  fixedPanels,
  flexPanelId,
  flexPanelMinPercent,
}: Options): Result {
  const [containerWidth, setContainerWidth] = useState(0);
  const [readySignature, setReadySignature] = useState<string | null>(null);
  const lastSignatureRef = useRef<string | null>(null);

  const targetLayout = useMemo(
    () =>
      buildLayout({
        containerWidth,
        fixedPanels,
        flexPanelId,
        flexPanelMinPercent,
      }),
    [containerWidth, fixedPanels, flexPanelId, flexPanelMinPercent],
  );
  const targetSignature = useMemo(
    () => layoutSignature(targetLayout),
    [targetLayout],
  );

  // 컨테이너 폭 측정.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const next = Math.round(container.getBoundingClientRect().width);
      setContainerWidth((current) => (current === next ? current : next));
    };
    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  // 측정된 폭으로 layout 적용.
  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || !targetLayout || !targetSignature) return;
    let readyFrame: number | null = null;

    const scheduleReady = (signature: string) => {
      readyFrame = requestAnimationFrame(() => {
        readyFrame = null;
        setReadySignature(signature);
      });
    };

    const expectedIds = [...fixedPanels.map((p) => p.id), flexPanelId];
    if (!groupLayoutMatchesPanels(group, expectedIds)) {
      return () => {
        readyFrame = cancelFrame(readyFrame);
      };
    }

    if (lastSignatureRef.current === targetSignature) {
      if (readySignature !== targetSignature) {
        scheduleReady(targetSignature);
      }
      return () => {
        readyFrame = cancelFrame(readyFrame);
      };
    }

    lastSignatureRef.current = targetSignature;

    let firstFrame: number | null = null;
    let secondFrame: number | null = null;
    group.setLayout(targetLayout);
    firstFrame = requestAnimationFrame(() => {
      firstFrame = null;
      secondFrame = requestAnimationFrame(() => {
        secondFrame = null;
        setReadySignature(targetSignature);
      });
    });

    return () => {
      readyFrame = cancelFrame(readyFrame);
      if (firstFrame !== null) cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
    };
  }, [
    fixedPanels,
    flexPanelId,
    groupRef,
    readySignature,
    targetLayout,
    targetSignature,
  ]);

  return {
    isLayoutReady: targetSignature !== null && readySignature === targetSignature,
  };
}
