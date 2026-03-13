import { useCallback, useState } from "react";
import { type Node } from "reactflow";

export interface SnapLine {
  id: string;
  type: "x" | "y" | "center-x" | "center-y";
  value: number;
}

const SNAP_THRESHOLD = 8;
// Use a small haptic vibration if supported (often trackpad vibration is simulated here or supported natively on some devices)
const triggerHapticFeedback = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    // A tiny pulse to signify snapping
    navigator.vibrate(5);
  }
};

export const useSmartSnap = (nodes: Node[]) => {
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);

  const handleNodeDrag = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      let newX = draggedNode.position.x;
      let newY = draggedNode.position.y;
      
      const width = draggedNode.width ?? 0;
      const height = draggedNode.height ?? 0;
      const centerX = newX + width / 2;
      const centerY = newY + height / 2;

      let snapped = false;

      const lines: SnapLine[] = [];

      nodes.forEach((node) => {
        if (node.id === draggedNode.id || !node.width || !node.height || node.hidden) return;

        // Bounding boxes
        const targetX = node.position.x;
        const targetY = node.position.y;
        const targetW = node.width;
        const targetH = node.height;
        const targetCenterX = targetX + targetW / 2;
        const targetCenterY = targetY + targetH / 2;

        // X-axis alignment (Left, Center, Right)
        const xDisplacements = [
          { type: 'x', diff: targetX - newX, value: targetX }, // Left - Left
          { type: 'x', diff: (targetX + targetW) - (newX + width), value: targetX + targetW }, // Right - Right
          { type: 'x', diff: targetX - (newX + width), value: targetX }, // Right - Left
          { type: 'x', diff: (targetX + targetW) - newX, value: targetX + targetW }, // Left - Right
          { type: 'center-x', diff: targetCenterX - centerX, value: targetCenterX }, // Center - Center
        ] as const;

        for (const disp of xDisplacements) {
          if (Math.abs(disp.diff) < SNAP_THRESHOLD) {
            newX += disp.diff;
            snapped = true;
            lines.push({ id: `x-${node.id}-${disp.value}`, type: disp.type, value: disp.value });
            break; // Stop checking this node's X once snapped
          }
        }

        // Y-axis alignment (Top, Center, Bottom)
        const yDisplacements = [
          { type: 'y', diff: targetY - newY, value: targetY }, // Top - Top
          { type: 'y', diff: (targetY + targetH) - (newY + height), value: targetY + targetH }, // Bottom - Bottom
          { type: 'y', diff: targetY - (newY + height), value: targetY }, // Bottom - Top
          { type: 'y', diff: (targetY + targetH) - newY, value: targetY + targetH }, // Top - Bottom
          { type: 'center-y', diff: targetCenterY - centerY, value: targetCenterY }, // Center - Center
        ] as const;

        for (const disp of yDisplacements) {
          if (Math.abs(disp.diff) < SNAP_THRESHOLD) {
            newY += disp.diff;
            snapped = true;
            lines.push({ id: `y-${node.id}-${disp.value}`, type: disp.type, value: disp.value });
            break; // Stop checking this node's Y once snapped
          }
        }
      });

      if (snapped && snapLines.length === 0) {
        triggerHapticFeedback();
      }

      setSnapLines(lines);
      
      // We directly mutate the node's position object so ReactFlow applies the snap instantly.
      // This works well within the react-flow node drag cycle.
      draggedNode.position.x = newX;
      draggedNode.position.y = newY;
    },
    [nodes, snapLines.length]
  );

  const handleNodeDragStop = useCallback(() => {
    setSnapLines([]);
  }, []);

  return {
    snapLines,
    handleNodeDrag,
    handleNodeDragStop
  };
};