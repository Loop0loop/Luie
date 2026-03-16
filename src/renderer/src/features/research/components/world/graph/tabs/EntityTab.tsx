import { useWorldGraphWorkspace } from "../hooks/useWorldGraphWorkspace";
import { EntityView } from "../views/EntityView";

type EntityTabProps = {
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

export function EntityTab({ selectedNodeId, onSelectNode }: EntityTabProps) {
  const { graphNodes } = useWorldGraphWorkspace();

  return (
    <EntityView
      nodes={graphNodes}
      selectedNodeId={selectedNodeId}
      onSelectNode={onSelectNode}
    />
  );
}
