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
import { Button } from "@renderer/components/ui/button";
import { Separator } from "@renderer/components/ui/separator";
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

/**
 * 캔버스 상단 툴바.
 * - 좌측: 생성/연결/그룹/정렬/뷰핏 액션
 * - 우측: 빠른 검색 (Outline과 별개로 캔버스 stage 내 검색)
 *
 * 액션 콜백은 모두 optional로 받아 셸 단계에서 안전하게 마운트된다.
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
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
      <Button variant="ghost" size="sm" onClick={onAddNode}>
        <Plus />
        {t(CANVAS_TOOLBAR_ACTION_KEYS.addNode)}
      </Button>
      <Button variant="ghost" size="sm" onClick={onAddNote}>
        <StickyNote />
        {t(CANVAS_TOOLBAR_ACTION_KEYS.addNote)}
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(CANVAS_TOOLBAR_ACTION_KEYS.connect)}
        title={t(CANVAS_TOOLBAR_ACTION_KEYS.connect)}
        onClick={onConnect}
      >
        <Link2 />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(CANVAS_TOOLBAR_ACTION_KEYS.group)}
        title={t(CANVAS_TOOLBAR_ACTION_KEYS.group)}
        onClick={onGroup}
      >
        <Frame />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(CANVAS_TOOLBAR_ACTION_KEYS.autoLayout)}
        title={t(CANVAS_TOOLBAR_ACTION_KEYS.autoLayout)}
        onClick={onAutoLayout}
      >
        <LayoutGrid />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t(CANVAS_TOOLBAR_ACTION_KEYS.fitView)}
        title={t(CANVAS_TOOLBAR_ACTION_KEYS.fitView)}
        onClick={onFitView}
      >
        <Maximize2 />
      </Button>

      <div className="ml-auto flex items-center">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder={t(CANVAS_TOOLBAR_ACTION_KEYS.searchPlaceholder)}
            onChange={(e) => onSearch?.(e.target.value)}
            className="h-7 w-44 pl-7 text-[12px]"
          />
        </div>
      </div>
    </div>
  );
}
