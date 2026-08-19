import type { LucideIcon } from "lucide-react";
import { Bot, Calendar, Globe, Shield, StickyNote, User } from "lucide-react";
import type { DragItemType } from "@shared/ui/GlobalDragContext";
import type { ResearchTab } from "@renderer/features/workspace/stores/uiStore";

type LegacyResearchTab = Exclude<ResearchTab, "plotboard" | "untitled">;

export type ResearchPanelTab = {
  dataType: DragItemType;
  icon: LucideIcon;
  id: string;
  tab: LegacyResearchTab;
  titleKey: string;
};

/** Docs rail과 Editor Binder가 같은 연구 카테고리를 같은 순서로 노출한다. */
export const RESEARCH_PANEL_TABS: readonly ResearchPanelTab[] = [
  { dataType: "character", icon: User, id: "binder-character", tab: "character", titleKey: "research.title.characters" },
  { dataType: "event", icon: Calendar, id: "binder-event", tab: "event", titleKey: "research.title.events" },
  { dataType: "faction", icon: Shield, id: "binder-faction", tab: "faction", titleKey: "research.title.factions" },
  { dataType: "world", icon: Globe, id: "binder-world", tab: "world", titleKey: "research.title.world" },
  { dataType: "memo", icon: StickyNote, id: "binder-memo", tab: "scrap", titleKey: "research.title.scrap" },
  { dataType: "analysis", icon: Bot, id: "binder-analysis", tab: "analysis", titleKey: "research.title.analysis" },
];
