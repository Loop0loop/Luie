/**
 * react-flow nodeTypes 매핑.
 *
 * 모듈 최상단에서 한 번만 만들어야 함 (react-flow가 매 렌더마다 새 객체면
 * 경고를 발생시킨다).
 */

import type { NodeTypes } from "reactflow";
import { EpisodeNode } from "./EpisodeNode";
import { CharacterNode } from "./CharacterNode";
import { EventNode } from "./EventNode";
import { PlaceNode } from "./PlaceNode";
import { NoteNode } from "./NoteNode";
import { CANVAS_NODE_TYPE } from "./nodeData";

export const CANVAS_NODE_TYPES: NodeTypes = {
  [CANVAS_NODE_TYPE.episode]: EpisodeNode,
  [CANVAS_NODE_TYPE.character]: CharacterNode,
  [CANVAS_NODE_TYPE.event]: EventNode,
  [CANVAS_NODE_TYPE.place]: PlaceNode,
  [CANVAS_NODE_TYPE.note]: NoteNode,
};

export type { CanvasNodeData } from "./nodeData";
export { CANVAS_NODE_TYPE } from "./nodeData";
