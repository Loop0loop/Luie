import { ChevronLeft } from "lucide-react";
import { BinderTabButton } from "./BinderTabButton";
import { buildBinderTabItems, type BinderTab } from "./binderSidebar.shared";

export function BinderSidebarTabs(props: {
  activeTab: BinderTab | null;
  compact?: boolean;
  onCloseRail?: () => void;
  onOpenRail?: () => void;
  onTabClick: (tab: BinderTab) => void;
  t: (key: string) => string;
}) {
  const tabItems = buildBinderTabItems(props.t);

  if (props.compact) {
    return (
      <div className="w-8 bg-surface border-l border-border flex items-start justify-center py-3 shrink-0">
        <button
          onClick={props.onOpenRail}
          className="w-6 h-6 rounded-md hover:bg-surface-hover text-muted-foreground flex items-center justify-center"
          title={props.t("sidebar.toggle.open")}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-12 bg-surface border-l border-border flex flex-col items-center py-3 gap-2 shrink-0 z-20 h-full">
      <button
        onClick={props.onCloseRail}
        className="w-9 h-9 mb-1 rounded-full hover:bg-surface-hover text-muted-foreground flex items-center justify-center transition-colors duration-150"
        title={props.t("sidebar.toggle.close")}
      >
        <ChevronLeft className="w-4 h-4 rotate-180" />
      </button>
      {tabItems.slice(0, 4).map((item) => (
        <BinderTabButton
          key={item.tab}
          icon={item.icon}
          isActive={props.activeTab === item.tab}
          onClick={() => props.onTabClick(item.tab)}
          title={item.title}
          type={item.type}
        />
      ))}
      <div className="w-6 h-px bg-border/50 my-1" />
      {tabItems.slice(4).map((item) => (
        <BinderTabButton
          key={item.tab}
          icon={item.icon}
          isActive={props.activeTab === item.tab}
          onClick={() => props.onTabClick(item.tab)}
          title={item.title}
          type={item.type}
        />
      ))}
    </div>
  );
}
