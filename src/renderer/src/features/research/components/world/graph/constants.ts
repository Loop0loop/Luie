import {
  Boxes,
  Clock3,
  LibraryBig,
  Package2,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { WorldEntitySourceType } from "@shared/types";
import type { GraphCreatePreset, GraphSurfaceTab } from "./types";

export const GRAPH_TAB_ITEMS: Array<{
  id: GraphSurfaceTab;
  label: string;
  description: string;
  Icon: LucideIcon;
}> = [
  {
    id: "canvas",
    label: "그래프",
    description: "카드와 연결을 보는 메인 캔버스",
    Icon: Boxes,
  },
  {
    id: "timeline",
    label: "타임라인",
    description: "사건을 시간 순으로 정렬",
    Icon: Clock3,
  },
  {
    id: "notes",
    label: "노트",
    description: "스크랩 메모와 연동",
    Icon: StickyNote,
  },
  {
    id: "entity",
    label: "엔티티",
    description: "캔버스 엔티티를 한눈에 정리",
    Icon: Users,
  },
  {
    id: "library",
    label: "라이브러리",
    description: "그래프 플러그인 관리",
    Icon: LibraryBig,
  },
];

export const GRAPH_CREATE_PRESETS: GraphCreatePreset[] = [
  { entityType: "Character", label: "인물 추가" },
  { entityType: "Event", label: "사건 추가" },
  { entityType: "Place", subType: "Place", label: "장소 추가" },
  { entityType: "Concept", subType: "Concept", label: "개념 추가" },
];

export const ENTITY_TYPE_COLORS: Record<
  WorldEntitySourceType,
  {
    chip: string;
    card: string;
  }
> = {
  Character: {
    chip: "bg-sky-500/12 text-sky-200 border-sky-400/25",
    card: "border-sky-400/25 bg-sky-500/10",
  },
  Event: {
    chip: "bg-amber-500/12 text-amber-200 border-amber-400/25",
    card: "border-amber-400/25 bg-amber-500/10",
  },
  Faction: {
    chip: "bg-rose-500/12 text-rose-200 border-rose-400/25",
    card: "border-rose-400/25 bg-rose-500/10",
  },
  Term: {
    chip: "bg-emerald-500/12 text-emerald-200 border-emerald-400/25",
    card: "border-emerald-400/25 bg-emerald-500/10",
  },
  Place: {
    chip: "bg-lime-500/12 text-lime-200 border-lime-400/25",
    card: "border-lime-400/25 bg-lime-500/10",
  },
  Concept: {
    chip: "bg-fuchsia-500/12 text-fuchsia-200 border-fuchsia-400/25",
    card: "border-fuchsia-400/25 bg-fuchsia-500/10",
  },
  Rule: {
    chip: "bg-violet-500/12 text-violet-200 border-violet-400/25",
    card: "border-violet-400/25 bg-violet-500/10",
  },
  Item: {
    chip: "bg-orange-500/12 text-orange-200 border-orange-400/25",
    card: "border-orange-400/25 bg-orange-500/10",
  },
  WorldEntity: {
    chip: "bg-zinc-500/12 text-zinc-200 border-zinc-400/25",
    card: "border-zinc-400/25 bg-zinc-500/10",
  },
};

export const GRAPH_FALLBACK_CANVAS_SIZE = {
  width: 1800,
  height: 1200,
};

export const GRAPH_NODE_CARD_SIZE = {
  width: 220,
  height: 132,
};

export const GRAPH_PLUGIN_EMPTY_ICON = Package2;
