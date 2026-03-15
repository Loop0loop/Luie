import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { GRAPH_TAB_ITEMS } from "../constants";
import type { GraphSurfaceTab } from "../types";

type GraphIconSidebarProps = {
  activeTab: GraphSurfaceTab;
  isSidebarOpen: boolean;
  onSelectTab: (tab: GraphSurfaceTab) => void;
  onToggleSidebar: () => void;
};

export function GraphIconSidebar({
  activeTab,
  isSidebarOpen,
  onSelectTab,
  onToggleSidebar,
}: GraphIconSidebarProps) {
  return (
    <aside className="flex w-[64px] shrink-0 flex-col items-center border-r border-border/60 bg-[#111318] py-3">
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onToggleSidebar}
        className="mb-3 h-10 w-10 rounded-xl border-border/60 bg-white/5 text-fg/80 hover:bg-white/10 hover:text-fg"
        title={isSidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
      >
        {isSidebarOpen ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </Button>

      <div className="flex w-full flex-1 flex-col items-center gap-1">
        {GRAPH_TAB_ITEMS.map(({ id, label, Icon }) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              title={label}
              className={[
                "group flex w-full flex-col items-center gap-1 px-2 py-2 text-[10px] transition",
                active ? "text-fg" : "text-fg/55 hover:text-fg/80",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-xl border transition",
                  active
                    ? "border-border/70 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                    : "border-transparent bg-transparent group-hover:border-border/40 group-hover:bg-white/5",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
              </span>
              <Badge variant={active ? "secondary" : "outline"} className="px-1.5 text-[10px]">
                {label}
              </Badge>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
