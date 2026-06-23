/**
 * Selection handler utilities for Canvas viewports.
 * Pure functions for handleSelectionChange and handlePaneClick callbacks.
 */

import type { OnSelectionChangeParams } from "reactflow";

/**
 * Handle node/edge selection changes from ReactFlow.
 * Selects single node, clears selection on empty/multi-select.
 */
export function handleSelectionChange(
  { nodes: selectedNodes }: OnSelectionChangeParams,
  selectNode: (id: string) => void,
  clearSelection: () => void,
) {
  if (selectedNodes.length === 1 && selectedNodes[0]) {
    selectNode(selectedNodes[0].id);
  } else if (selectedNodes.length === 0) {
    clearSelection();
  }
}

/**
 * Handle pane click - clears current selection.
 */
export function handlePaneClick(clearSelection: () => void) {
  clearSelection();
}
