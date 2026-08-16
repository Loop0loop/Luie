import type { OnSelectionChangeParams } from "reactflow";

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

export function handlePaneClick(clearSelection: () => void) {
  clearSelection();
}
