import type { WorldGraphNode } from "@shared/types";
import { EntityView } from "../views/EntityView";

type EntityTabProps = {
  graphNodes: WorldGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
};

export function EntityTab({
  graphNodes,
  selectedNodeId,
  onSelectNode,
}: EntityTabProps) {
  return (
    <EntityView
      nodes={graphNodes}
      selectedNodeId={selectedNodeId}
      onSelectNode={onSelectNode}
    />
  );
}
