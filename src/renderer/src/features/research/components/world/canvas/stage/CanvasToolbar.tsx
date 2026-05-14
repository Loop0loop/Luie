import { useTranslation } from "react-i18next";
import {
  Plus,
  Link2,
  Frame,
  LayoutGrid,
  Maximize2,
  Search,
  StickyNote,
} from "lucide-react";
import { cn } from "@renderer/lib/utils";
import { Input } from "@renderer/components/ui/input";
import { CANVAS_TOOLBAR_ACTION_KEYS } from "../shared/constants";

interface CanvasToolbarProps {
  onAddNode?: () => void;
  onAddNote?: () => void;
  onConnect?: () => void;
  onGroup?: () => void;
  onAutoLayout?: () => void;
  onFitView?: () => void;
  onSearch?: (query: string) => void;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label?: string;
  title: string;
  onClick?: () => void;
}

function ToolbarButton({ icon, label, title, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] transition-colors",
        "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        "active:scale-[0.97]",
      )}
    >
      {icon}
      {label ? <span>{label}</span> : null}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-4 w-px bg-border/50" />;
}

/**
 * 캔버스 상단 툴바 — Obsidian 스타일.
 *
 * 미니멀한 아이콘 + 라벨 버튼. 배경은 투명, 하단 border로 구분.
 * 우측에 인라인 검색 필드.
 */
export function CanvasToolbar({
  onAddNode,
  onAddNote,
  onConnect,
  onGroup,
  onAutoLayout,
  onFitView,
  onSearch,
}: CanvasToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-9 shrink-0 items-center border-b border-border/50 bg-background px-2">
      <ToolbarButton
        icon={<Plus className="size-3.5" />}
        label={t(CANVAS_TOOLBAR_ACTION_KEYS.addNode)}
        title={t(CANVAS_TOOLBAR_ACTION_KEYS.addNode)}
        onClick={onAddNode}
      />
      <ToolbarButton
        icon={<StickyNote className="size-3.5" />}
        label={t(CANVAS_TOOLBAR_ACTION_KEYS.addNote)}
        title={t(CANVAS_TOOLBAR_ACTION_KEYS.addNote)}
        onClick={onAddNote}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<Link2 className="size-3.5" />}
        title={t(CANVAS_TOOLBAR_ACTION_KEYS.connect)}
        onClick={onConnect}
      />
      <ToolbarButton
        icon={<Frame className="size-3.5" />}
        title={t(CANVAS_TOOLBAR_ACTION_KEYS.group)}
        onClick={onGroup}
      />

      <ToolbarDivider />

      <ToolbarButton
        icon={<LayoutGrid className="size-3.5" />}
        title={t(CANVAS_TOOLBAR_ACTION_KEYS.autoLayout)}
        onClick={onAutoLayout}
      />
      <ToolbarButton
        icon={<Maximize2 className="size-3.5" />}
        title={t(CANVAS_TOOLBAR_ACTION_KEYS.fitView)}
        onClick={onFitView}
      />

      <div className="ml-auto flex items-center">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder={t(CANVAS_TOOLBAR_ACTION_KEYS.searchPlaceholder)}
            onChange={(e) => onSearch?.(e.target.value)}
            className="h-6 w-40 rounded-md border-border/50 bg-transparent pl-7 text-[11px] placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:ring-0"
          />
        </div>
      </div>
    </div>
  );
}
