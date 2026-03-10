import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";

type FixedPanelSpec = {
  id: string;
  widthPx: number;
  minPx: number;
  maxPx: number;
};

type UseFixedPixelPanelGroupLayoutOptions = {
  containerRef: MutableRefObject<HTMLElement | null>;
  groupRef: MutableRefObject<GroupImperativeHandle | null>;
  fixedPanels: FixedPanelSpec[];
  flexPanelId: string;
  flexPanelMinPercent: number;
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundPercent = (value: number): number =>
  Number(clampNumber(value, 0, 100).toFixed(3));

export function useFixedPixelPanelGroupLayout({
  containerRef,
  groupRef,
  fixedPanels,
  flexPanelId,
  flexPanelMinPercent,
}: UseFixedPixelPanelGroupLayoutOptions): void {
  const [containerWidth, setContainerWidth] = useState(0);
  const lastLayoutSignatureRef = useRef<string | null>(null);

  useEffect(() => {
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

  useEffect(() => {
    const group = groupRef.current;
    if (!group || containerWidth <= 0) return;

    const nextLayout: Record<string, number> = {};
    const maxFixedPercent = Math.max(0, 100 - flexPanelMinPercent);

    const requestedFixedPercents = fixedPanels.map((panel) => {
      const requestedWidthPx = clampNumber(panel.widthPx, panel.minPx, panel.maxPx);
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

    const signature = JSON.stringify(nextLayout);
    if (lastLayoutSignatureRef.current === signature) {
      return;
    }

    lastLayoutSignatureRef.current = signature;
    group.setLayout(nextLayout);
  }, [containerWidth, fixedPanels, flexPanelId, flexPanelMinPercent, groupRef]);
}
