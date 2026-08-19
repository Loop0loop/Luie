import type { ReactNode } from "react";
import {
  History,
  LayoutGrid,
  Trash2,
} from "lucide-react";
import type { DragItemType } from "@shared/ui/GlobalDragContext";
import type { EditorLayoutPanelTab } from "@renderer/shared/constants/layoutSizing";
import { RESEARCH_PANEL_TABS } from "@renderer/features/workspace/components/researchPanelTabs";

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
  "canvas",
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
    ...RESEARCH_PANEL_TABS.map((item) => ({
      tab: item.tab,
      icon: <item.icon className="w-5 h-5" />,
      title: t(item.titleKey),
      type: item.dataType,
    })),
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
    {
      tab: "canvas",
      icon: <LayoutGrid className="w-5 h-5" />,
      title: t("canvas.binder.title"),
    },
  ];
}
