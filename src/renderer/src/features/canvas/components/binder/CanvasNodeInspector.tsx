/**
 * CanvasNodeInspector — BinderBar panel for the selected canvas node.
 * 
 * 분기 처리:
 *   - node.entityType === "Character" -> CharacterInspectorView
 *   - node.entityType === "Event" -> EventInspectorView
 *   - node.entityType === "Chapter" -> ChapterInspectorView
 *   - 기타 -> GenericEntityInspector
 */

import { useTranslation } from "react-i18next";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import {
  CANVAS_NODE_KIND_COLOUR,
  ENTITY_TYPE_TO_NODE_KIND,
} from "@renderer/features/canvas/types";
import type { CanvasNodeKind } from "@renderer/features/canvas/types";

// 분할된 인스펙터 뷰
import CharacterInspectorView from "./inspectors/CharacterInspectorView";
import EventInspectorView from "./inspectors/EventInspectorView";
import ChapterInspectorView from "./inspectors/ChapterInspectorView";
import GenericEntityView from "./inspectors/GenericEntityView";

interface CanvasNodeInspectorProps {
  nodeId: string;
}

export default function CanvasNodeInspector({ nodeId }: CanvasNodeInspectorProps) {
  const { t } = useTranslation();
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);
  const selectNode = useCanvasViewStore((s) => s.selectNode);

  const node = graphData?.nodes.find((n) => n.id === nodeId) ?? null;

  if (!node) {
    return (
      <div className="h-full bg-panel p-panel-pad text-xs italic text-muted">
        {t("canvas.status.empty")}
      </div>
    );
  }

  const normalizedType = node.entityType ? node.entityType.toLowerCase() : "";

  // 캐릭터 위키 재활용
  if (normalizedType === "character") {
    return <CharacterInspectorView nodeId={node.id} />;
  }

  // 사건 타임라인 상세 재활용
  if (normalizedType === "event") {
    return <EventInspectorView nodeId={node.id} />;
  }

  // 챕터 전용 인스펙터
  if (normalizedType === "chapter") {
    return <ChapterInspectorView nodeId={node.id} nodeName={node.name} />;
  }

  // 기타 엔티티 (Faction, Term, WorldEntity)
  const kind: CanvasNodeKind =
    ENTITY_TYPE_TO_NODE_KIND[node.entityType as keyof typeof ENTITY_TYPE_TO_NODE_KIND] ?? "world-entity";
  const kindColor = CANVAS_NODE_KIND_COLOUR[kind] ?? CANVAS_NODE_KIND_COLOUR["world-entity"];

  const connectedNodes = (graphData?.nodes ?? []).filter((n) =>
    graphData?.edges.some(
      (edge) =>
        (edge.sourceId === nodeId && edge.targetId === n.id) ||
        (edge.targetId === nodeId && edge.sourceId === n.id),
    ),
  );

  const connectedEdges = (graphData?.edges ?? []).filter(
    (edge) => edge.sourceId === nodeId || edge.targetId === nodeId,
  );

  return (
    <GenericEntityView
      node={node}
      kind={kind}
      kindColor={kindColor}
      connectedNodes={connectedNodes}
      connectedEdges={connectedEdges}
      onSelectNode={selectNode}
      onClearSelection={clearSelection}
    />
  );
}
