import { useCallback, useState } from "react";
import { type Node } from "reactflow";

export type SnapLineType = "x" | "y" | "center-x" | "center-y";

export interface SnapLine {
  id: string;
  type: SnapLineType;
  value: number; // coordinate
  start?: number; // visual start
  end?: number; // visual end
}

export interface SnapGap {
  id: string;
  axis: "x" | "y";
  gapValue: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const SNAP_THRESHOLD = 6; // pixels

const triggerHapticFeedback = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(5);
  }
  if (typeof window !== "undefined" && (window as any).api?.window?.hapticFeedback) {
    try {
      (window as any).api.window.hapticFeedback();
    } catch {}
  }
};

export const useSmartSnap = (nodes: Node[]) => {
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [snapGaps, setSnapGaps] = useState<SnapGap[]>([]);

  const handleNodeDrag = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      let newX = draggedNode.position.x;
      let newY = draggedNode.position.y;
      
      const width = draggedNode.width ?? 0;
      const height = draggedNode.height ?? 0;
      
      let snapped = false;

      const lines: SnapLine[] = [];
      const gaps: SnapGap[] = [];
      const otherNodes = nodes.filter(n => n.id !== draggedNode.id && n.width && n.height && !n.hidden);

      // --- 1. Basic Alignments (Edges & Center) ---
      for (const node of otherNodes) {
        const targetX = node.position.x;
        const targetY = node.position.y;
        const targetW = node.width!;
        const targetH = node.height!;
        
        const centerX = newX + width / 2;
        const targetCenterX = targetX + targetW / 2;
        const centerY = newY + height / 2;
        const targetCenterY = targetY + targetH / 2;

        const vStart = Math.min(newY, targetY) - 50;
        const vEnd = Math.max(newY + height, targetY + targetH) + 50;
        
        const hStart = Math.min(newX, targetX) - 50;
        const hEnd = Math.max(newX + width, targetX + targetW) + 50;

        // X-axis alignment
        const xDisplacements = [
          { type: "x", diff: targetX - newX, value: targetX }, 
          { type: "x", diff: (targetX + targetW) - (newX + width), value: targetX + targetW }, 
          { type: "x", diff: targetX - (newX + width), value: targetX }, 
          { type: "x", diff: (targetX + targetW) - newX, value: targetX + targetW }, 
          { type: "center-x", diff: targetCenterX - centerX, value: targetCenterX }, 
        ] as const;

        for (const disp of xDisplacements) {
          if (Math.abs(disp.diff) < SNAP_THRESHOLD) {
            newX += disp.diff;
            snapped = true;
            lines.push({ id: `x-${node.id}-${disp.value}`, type: disp.type, value: disp.value, start: vStart, end: vEnd });
            break;
          }
        }

        // Y-axis alignment
        const yDisplacements = [
          { type: "y", diff: targetY - newY, value: targetY }, 
          { type: "y", diff: (targetY + targetH) - (newY + height), value: targetY + targetH }, 
          { type: "y", diff: targetY - (newY + height), value: targetY }, 
          { type: "y", diff: (targetY + targetH) - newY, value: targetY + targetH }, 
          { type: "center-y", diff: targetCenterY - centerY, value: targetCenterY }, 
        ] as const;

        for (const disp of yDisplacements) {
          if (Math.abs(disp.diff) < SNAP_THRESHOLD) {
            newY += disp.diff;
            snapped = true;
            lines.push({ id: `y-${node.id}-${disp.value}`, type: disp.type, value: disp.value, start: hStart, end: hEnd });
            break;
          }
        }
      }

      // --- 2. Intelligent Gap Distances (Figma-like Equal Spacing) ---
      // X-Axis Gaps
      const yBandNodes = otherNodes.filter(n => Math.abs((n.position.y + n.height! / 2) - (newY + height / 2)) < 50);
      if (yBandNodes.length >= 2) {
        yBandNodes.sort((a,b) => a.position.x - b.position.x);
        for (let i = 0; i < yBandNodes.length - 1; i++) {
          const n1 = yBandNodes[i];
          const n2 = yBandNodes[i+1];
          const gap = n2.position.x - (n1.position.x + n1.width!);
          if (gap > 0) {
            const expectedLeft = n2.position.x + n2.width! + gap;
            if (Math.abs(expectedLeft - newX) < SNAP_THRESHOLD) {
              newX = expectedLeft;
              snapped = true;
              gaps.push({ id: `gap-x-1-${n1.id}`, axis: "x", gapValue: gap, startX: n1.position.x + n1.width!, startY: n1.position.y + n1.height!/2, endX: n2.position.x, endY: n2.position.y + n2.height!/2 });
              gaps.push({ id: `gap-x-2-${n2.id}`, axis: "x", gapValue: gap, startX: n2.position.x + n2.width!, startY: n2.position.y + n2.height!/2, endX: newX, endY: newY + height/2 });
            }
            const expectedRight = n1.position.x - gap;
            if (Math.abs((newX + width) - expectedRight) < SNAP_THRESHOLD) {
              newX = expectedRight - width;
              snapped = true;
              gaps.push({ id: `gap-x-1-${n1.id}`, axis: "x", gapValue: gap, startX: newX + width, startY: newY + height/2, endX: n1.position.x, endY: n1.position.y + n1.height!/2 });
              gaps.push({ id: `gap-x-2-${n2.id}`, axis: "x", gapValue: gap, startX: n1.position.x + n1.width!, startY: n1.position.y + n1.height!/2, endX: n2.position.x, endY: n2.position.y + n2.height!/2 });
            }
          }
        }
      }

      // Y-Axis Gaps
      const xBandNodes = otherNodes.filter(n => Math.abs((n.position.x + n.width! / 2) - (newX + width / 2)) < 50);
      if (xBandNodes.length >= 2) {
        xBandNodes.sort((a,b) => a.position.y - b.position.y);
        for (let i = 0; i < xBandNodes.length - 1; i++) {
          const n1 = xBandNodes[i];
          const n2 = xBandNodes[i+1];
          const gap = n2.position.y - (n1.position.y + n1.height!);
          if (gap > 0) {
            const expectedTop = n2.position.y + n2.height! + gap;
            if (Math.abs(expectedTop - newY) < SNAP_THRESHOLD) {
              newY = expectedTop;
              snapped = true;
              gaps.push({ id: `gap-y-1-${n1.id}`, axis: "y", gapValue: gap, startX: n1.position.x + n1.width!/2, startY: n1.position.y + n1.height!, endX: n2.position.x + n2.width!/2, endY: n2.position.y });
              gaps.push({ id: `gap-y-2-${n2.id}`, axis: "y", gapValue: gap, startX: n2.position.x + n2.width!/2, startY: n2.position.y + n2.height!, endX: newX + width/2, endY: newY });
            }
            const expectedBottom = n1.position.y - gap;
            if (Math.abs((newY + height) - expectedBottom) < SNAP_THRESHOLD) {
              newY = expectedBottom - height;
              snapped = true;
              gaps.push({ id: `gap-y-1-${n1.id}`, axis: "y", gapValue: gap, startX: newX + width/2, startY: newY + height, endX: n1.position.x + n1.width!/2, endY: n1.position.y });
              gaps.push({ id: `gap-y-2-${n2.id}`, axis: "y", gapValue: gap, startX: n1.position.x + n1.width!/2, startY: n1.position.y + n1.height!, endX: n2.position.x + n2.width!/2, endY: n2.position.y });
            }
          }
        }
      }

      if ((snapped && snapLines.length === 0 && gaps.length === 0) || (snapped && lines.length > snapLines.length) || (snapped && gaps.length > snapGaps.length)) {
        triggerHapticFeedback();
      }

      setSnapLines(lines);
      setSnapGaps(gaps); 
      
      draggedNode.position.x = newX;
      draggedNode.position.y = newY;
    },
    [nodes, snapLines.length, snapGaps.length]
  );

  const handleNodeDragStop = useCallback(() => {
    setSnapLines(lines => lines.length > 0 ? [] : lines);
    setSnapGaps(gaps => gaps.length > 0 ? [] : gaps);
  }, []);

  return {
    snapLines,
    snapGaps,
    handleNodeDrag,
    handleNodeDragStop
  };
};