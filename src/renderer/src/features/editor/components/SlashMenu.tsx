import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { Editor, Range } from "@tiptap/core";
import { cn } from "@shared/types/utils";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  CheckSquare,
  ListOrdered,
  ChevronRight,
  Quote,
  Minus,
  MessageSquare,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  SLASH_MENU_LISTBOX_ID,
  slashMenuOptionId,
} from "@renderer/features/editor/constants/suggestion";

export interface SlashMenuActionProps {
  editor: Editor;
  range: Range;
}

export type SlashMenuCategory = "headings" | "lists" | "blocks";

export interface SlashMenuItem {
  id: string;
  label: string;
  category: SlashMenuCategory;
  hint?: string;
  action: (props: SlashMenuActionProps) => void;
}

export interface SlashMenuHandle {
  onKeyDown: (args: { event: KeyboardEvent }) => boolean;
}

interface SlashMenuProps {
  items: SlashMenuItem[];
  command: (item: SlashMenuItem) => void;
  /**
   * NOTE: 이 메뉴가 열려 있는 동안 포커스는 편집 영역(ProseMirror contenteditable)에
   * 남는다. 그래서 `aria-activedescendant`를 여기 붙여도 의미가 없다 — 포커스된 요소에
   * 붙어야 보조기술이 읽는다. 활성 항목 id를 위로 올려 `suggestion.tsx`가 편집 영역
   * DOM에 반영한다.
   */
  onActiveOptionChange?: (optionId: string | null) => void;
}

const ICONS: Record<string, ReactElement> = {
  h1: <Heading1 className="w-4 h-4 stroke-[2.2]" />,
  h2: <Heading2 className="w-4 h-4 stroke-[2.2]" />,
  h3: <Heading3 className="w-4 h-4 stroke-[2.2]" />,
  bullet: <List className="w-4 h-4 stroke-[2.2]" />,
  number: <ListOrdered className="w-4 h-4 stroke-[2.2]" />,
  check: <CheckSquare className="w-4 h-4 stroke-[2.2]" />,
  toggle: <ChevronRight className="w-4 h-4 stroke-[2.2]" />,
  quote: <Quote className="w-4 h-4 stroke-[2.2]" />,
  callout: <MessageSquare className="w-4 h-4 stroke-[2.2]" />,
  divider: <Minus className="w-4 h-4 stroke-[2.2]" />,
};

const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, command, onActiveOptionChange }: SlashMenuProps,
  ref,
) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const descriptions = useMemo<Record<string, string>>(
    () => ({
      h1: t("slashMenu.description.h1"),
      h2: t("slashMenu.description.h2"),
      h3: t("slashMenu.description.h3"),
      bullet: t("slashMenu.description.bullet"),
      number: t("slashMenu.description.number"),
      check: t("slashMenu.description.check"),
      toggle: t("slashMenu.description.toggle"),
      quote: t("slashMenu.description.quote"),
      callout: t("slashMenu.description.callout"),
      divider: t("slashMenu.description.divider"),
    }),
    [t],
  );

  const categoryTitles = useMemo<Record<SlashMenuCategory, string>>(
    () => ({
      headings: t("slashMenu.category.headings"),
      lists: t("slashMenu.category.lists"),
      blocks: t("slashMenu.category.blocks"),
    }),
    [t],
  );

  const effectiveSelectedIndex =
    selectedIndex >= 0 && selectedIndex < items.length ? selectedIndex : 0;

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((prev) => (prev + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(effectiveSelectedIndex);
  };

  useEffect(() => {
    const el = itemRefs.current[effectiveSelectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [effectiveSelectedIndex]);

  // NOTE: 포커스가 편집 영역에 남으므로 활성 항목 id를 그쪽으로 올린다. 언마운트 시
  // null을 보내 편집 영역의 속성을 지운다(메뉴가 닫힌 뒤에도 남으면 없는 요소를 가리킨다).
  useEffect(() => {
    if (!items.length) return;
    onActiveOptionChange?.(slashMenuOptionId(effectiveSelectedIndex));
  }, [effectiveSelectedIndex, items.length, onActiveOptionChange]);

  useEffect(() => () => onActiveOptionChange?.(null), [onActiveOptionChange]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        upHandler();
        return true;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        downHandler();
        return true;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  if (!items.length) {
    return null;
  }

  return (
    <div
      className="w-72 sm:w-80 max-h-[380px] bg-panel/95 backdrop-blur-xl border border-border rounded-panel shadow-modal z-dropdown overflow-hidden flex flex-col font-sans select-none"
      onMouseDown={(e) => {
        // NOTE: pointer interaction이 editor focus를 빼앗아 Suggestion이 닫히지 않게 한다.
        e.preventDefault();
      }}
    >
      <div className="px-3 py-2 text-[11px] font-semibold text-muted uppercase tracking-wider bg-bg-secondary/60 border-b border-border flex items-center justify-between">
        <span>{t("slashMenu.header")}</span>
        <span className="text-[10px] font-normal text-subtle lowercase">esc to close</span>
      </div>

      <div
        className="p-1.5 overflow-y-auto max-h-[320px] flex flex-col gap-0.5"
        id={SLASH_MENU_LISTBOX_ID}
        role="listbox"
        aria-label={t("slashMenu.header")}
      >
        {items.map((item, index) => {
          const isSelected = index === effectiveSelectedIndex;
          const prevItem = items[index - 1];
          const showCategoryHeader = !prevItem || prevItem.category !== item.category;

          return (
            <div key={item.id} className="flex flex-col">
              {showCategoryHeader && item.category && (
                <div
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold text-muted/70 uppercase tracking-wider",
                    index > 0 && "mt-1.5 pt-1 border-t border-border/50",
                  )}
                  aria-hidden="true"
                >
                  {categoryTitles[item.category] || item.category}
                </div>
              )}
              <div
                id={slashMenuOptionId(index)}
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "group flex items-center px-2 py-1.5 rounded-control cursor-pointer transition-all duration-75 gap-2.5",
                  isSelected
                    ? "bg-element text-fg shadow-xs"
                    : "hover:bg-surface-hover/80 text-fg",
                )}
                onClick={() => selectItem(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-7.5 h-7.5 rounded-md border text-fg shrink-0 transition-colors",
                    isSelected
                      ? "bg-surface border-border-strong text-accent shadow-xs"
                      : "bg-element/50 border-border/50 text-muted group-hover:text-fg group-hover:bg-element",
                  )}
                >
                  {ICONS[item.id]}
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-fg truncate">
                      {item.label}
                    </span>
                    {item.hint && (
                      <kbd
                        className={cn(
                          "shrink-0 px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors",
                          isSelected
                            ? "bg-surface text-fg border-border-strong"
                            : "bg-element/40 text-muted/80 border-border/40",
                        )}
                      >
                        {item.hint}
                      </kbd>
                    )}
                  </div>
                  {descriptions[item.id] && (
                    <div className="text-[11px] text-muted truncate mt-0.5">
                      {descriptions[item.id]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

SlashMenu.displayName = "SlashMenu";

export default SlashMenu;
