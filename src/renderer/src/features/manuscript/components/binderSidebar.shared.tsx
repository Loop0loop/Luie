import type { ReactNode } from "react";
import {
  Calendar,
  Globe,
  History,
  Shield,
  Sparkles,
  StickyNote,
  Trash2,
  User,
} from "lucide-react";
import type { DragItemType } from "@shared/ui/GlobalDragContext";
import type { EditorLayoutPanelTab } from "@shared/constants/layoutSizing";

export type BinderTab = EditorLayoutPanelTab;

export const BINDER_VALID_TABS: BinderTab[] = [
  "character",
  "event",
  "faction",
  "world",
  "scrap",
  "analysis",
  "snapshot",
  "trash",
];

type BinderTabItem = {
  tab: BinderTab;
  icon: ReactNode;
  title: string;
  type?: DragItemType;
};

export function buildBinderTabItems(
  t: (key: string) => string,
): BinderTabItem[] {
  return [
    {
      tab: "character",
      icon: <User className="w-5 h-5" />,
      title: t("research.title.characters"),
      type: "character",
    },
    {
      tab: "event",
      icon: <Calendar className="w-5 h-5" />,
      title: t("research.title.events"),
      type: "event",
    },
    {
      tab: "faction",
      icon: <Shield className="w-5 h-5" />,
      title: t("research.title.factions"),
      type: "faction",
    },
    {
      tab: "world",
      icon: <Globe className="w-5 h-5" />,
      title: t("research.title.world"),
      type: "world",
    },
    {
      tab: "scrap",
      icon: <StickyNote className="w-5 h-5" />,
      title: t("research.title.scrap"),
      type: "memo",
    },
    {
      tab: "analysis",
      icon: <Sparkles className="w-5 h-5" />,
      title: t("research.title.analysis"),
      type: "analysis",
    },
    {
      tab: "snapshot",
      icon: <History className="w-5 h-5" />,
      title: t("sidebar.section.snapshot"),
      type: "snapshot",
    },
    {
      tab: "trash",
      icon: <Trash2 className="w-5 h-5" />,
      title: t("sidebar.section.trash"),
      type: "trash",
    },
  ];
}
