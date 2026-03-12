import { useMemo } from "react";
import type { Node, Edge } from "reactflow";

interface UseWorldGraphLayoutProps {
  nodes: Node[];
  edges: Edge[];
}

export function useWorldGraphLayout({ nodes, edges }: UseWorldGraphLayoutProps) {
  const layoutedNodes = useMemo<Node[]>(() => {
    return nodes;
  }, [nodes]);

  const layoutedEdges = useMemo<Edge[]>(() => edges, [edges]);

  return { layoutedNodes, layoutedEdges };
}
