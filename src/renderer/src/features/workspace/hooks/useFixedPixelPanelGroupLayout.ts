import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";
import { groupLayoutMatchesPanels } from "@renderer/features/workspace/utils/panelGroupLayout";
import { beginLayoutRestoring } from "./useProjectLayoutPersistence";

type FixedPanelSpec = {
  id: string;
  widthPx: number;
  minPx: number;
  maxPx: number;
  /** When true, the panel is collapsed to 0% regardless of widthPx. */
  collapsed?: boolean;
};

type UseFixedPixelPanelGroupLayoutOptions = {
  containerRef: MutableRefObject<HTMLElement | null>;
  groupRef: MutableRefObject<GroupImperativeHandle | null>;
  fixedPanels: FixedPanelSpec[];
  flexPanelId: string;
  flexPanelMinPercent: number;
};

type FixedPixelPanelGroupLayoutState = {
  isLayoutReady: boolean;
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundPercent = (value: number): number =>
  Number(clampNumber(value, 0, 100).toFixed(3));

const buildFixedPixelLayout = ({
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

  const nextLayout: Record<string, number> = {};
  const maxFixedPercent = Math.max(0, 100 - flexPanelMinPercent);

  const requestedFixedPercents = fixedPanels.map((panel) => {
    const requestedWidthPx = panel.collapsed
      ? 0
      : clampNumber(panel.widthPx, panel.minPx, panel.maxPx);
    return {
      id: panel.id,
      percent: roundPercent((requestedWidthPx / containerWidth) * 100),
    };
  });

  const requestedFixedTotal = requestedFixedPercents.reduce(
    (total, panel) => total + panel.percent,
    0,
  );
  const scale =
    requestedFixedTotal > maxFixedPercent && requestedFixedTotal > 0
      ? maxFixedPercent / requestedFixedTotal
      : 1;

  let fixedTotal = 0;
  requestedFixedPercents.forEach((panel) => {
    const percent = roundPercent(panel.percent * scale);
    nextLayout[panel.id] = percent;
    fixedTotal += percent;
  });

  nextLayout[flexPanelId] = roundPercent(Math.max(flexPanelMinPercent, 100 - fixedTotal));
  return nextLayout;
};

const buildLayoutSignature = (layout: Record<string, number> | null): string | null =>
  layout ? JSON.stringify(layout) : null;

const cancelFrame = (frameId: number | null): null => {
  if (frameId !== null) {
    cancelAnimationFrame(frameId);
  }
  return null;
};

export function useFixedPixelPanelGroupLayout({
  containerRef,
  groupRef,
  fixedPanels,
  flexPanelId,
  flexPanelMinPercent,
}: UseFixedPixelPanelGroupLayoutOptions): FixedPixelPanelGroupLayoutState {
  const [containerWidth, setContainerWidth] = useState(0);
  const [readyLayoutSignature, setReadyLayoutSignature] = useState<string | null>(null);
  const lastLayoutSignatureRef = useRef<string | null>(null);

  const targetLayout = useMemo(
    () =>
      buildFixedPixelLayout({
        containerWidth,
        fixedPanels,
        flexPanelId,
        flexPanelMinPercent,
      }),
    [containerWidth, fixedPanels, flexPanelId, flexPanelMinPercent],
  );
  const targetLayoutSignature = useMemo(
    () => buildLayoutSignature(targetLayout),
    [targetLayout],
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const nextWidth = Math.round(container.getBoundingClientRect().width);
      setContainerWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || !targetLayout || !targetLayoutSignature) return;
    let readyFrame: number | null = null;

    const scheduleLayoutReady = (signature: string) => {
      readyFrame = requestAnimationFrame(() => {
        readyFrame = null;
        setReadyLayoutSignature(signature);
      });
    };

    const expectedPanelIds = [...fixedPanels.map((panel) => panel.id), flexPanelId];
    if (!groupLayoutMatchesPanels(group, expectedPanelIds)) {
      return () => {
        readyFrame = cancelFrame(readyFrame);
      };
    }

    if (lastLayoutSignatureRef.current === targetLayoutSignature) {
      if (readyLayoutSignature !== targetLayoutSignature) {
        scheduleLayoutReady(targetLayoutSignature);
      }
      return () => {
        readyFrame = cancelFrame(readyFrame);
      };
    }

    lastLayoutSignatureRef.current = targetLayoutSignature;
    const endRestoring = beginLayoutRestoring();
    let ended = false;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;
    const finishRestoring = () => {
      if (ended) return;
      ended = true;
      endRestoring();
    };
    const completeInitialLayout = () => {
      finishRestoring();
      setReadyLayoutSignature(targetLayoutSignature);
    };
    group.setLayout(targetLayout);
    firstFrame = requestAnimationFrame(() => {
      firstFrame = null;
      secondFrame = requestAnimationFrame(() => {
        secondFrame = null;
        completeInitialLayout();
      });
    });

    return () => {
      readyFrame = cancelFrame(readyFrame);
      if (firstFrame !== null) {
        cancelAnimationFrame(firstFrame);
      }
      if (secondFrame !== null) {
        cancelAnimationFrame(secondFrame);
      }
      finishRestoring();
    };
  }, [
    fixedPanels,
    flexPanelId,
    groupRef,
    readyLayoutSignature,
    targetLayout,
    targetLayoutSignature,
  ]);

  return { isLayoutReady: targetLayoutSignature !== null && readyLayoutSignature === targetLayoutSignature };
}
