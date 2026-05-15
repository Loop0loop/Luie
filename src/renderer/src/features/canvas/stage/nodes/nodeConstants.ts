/**
 * 캔버스 노드의 시각 토큰.
 *
 * 종류별 컬러 / 아이콘 / i18n key를 한 곳에서 관리한다.
 * 컴포넌트 안에서 직접 매핑하지 않는다.
 */

import { BookOpen, User, Calendar, MapPin, StickyNote } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CanvasNodeKind } from "../../types";

/** 노드 종류별 accent 색상 (테두리/아이콘) */
export const CANVAS_NODE_TINT: Record<CanvasNodeKind, string> = {
  episode: "#a78bfa", // violet
  character: "#60a5fa", // blue
  event: "#f87171", // red
  place: "#34d399", // emerald
  note: "#fbbf24", // amber
};

/** 노드 종류별 아이콘 */
export const CANVAS_NODE_ICON: Record<CanvasNodeKind, LucideIcon> = {
  episode: BookOpen,
  character: User,
  event: Calendar,
  place: MapPin,
  note: StickyNote,
};

/** 노드 종류별 라벨 i18n key */
export const CANVAS_NODE_LABEL_KEY: Record<CanvasNodeKind, string> = {
  episode: "canvas.node.kind.episode",
  character: "canvas.node.kind.character",
  event: "canvas.node.kind.event",
  place: "canvas.node.kind.place",
  note: "canvas.node.kind.note",
};

/** 노드 카드 사이즈 */
export const CANVAS_NODE_SIZE = {
  MIN_WIDTH: 160,
  MAX_WIDTH: 240,
} as const;
