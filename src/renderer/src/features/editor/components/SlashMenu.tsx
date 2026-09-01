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

export interface SlashMenuItem {
  id: string;
  label: string;
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
  h1: <Heading1 className="icon-lg" />,
  h2: <Heading2 className="icon-lg" />,
  h3: <Heading3 className="icon-lg" />,
  bullet: <List className="icon-lg" />,
  number: <ListOrdered className="icon-lg" />,
  check: <CheckSquare className="icon-lg" />,
  toggle: <ChevronRight className="icon-lg" />,
  quote: <Quote className="icon-lg" />,
  callout: <MessageSquare className="icon-lg" />,
  divider: <Minus className="icon-lg" />,
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
      className="absolute w-75 max-h-80 bg-panel border border-border rounded-control shadow-panel z-dropdown overflow-y-auto flex flex-col font-sans"
      onMouseDown={(e) => {
        // NOTE: pointer interaction이 editor focus를 빼앗아 Suggestion이 닫히지 않게 한다.
        e.preventDefault();
      }}
    >
      <div className="px-3 py-2 text-[11px] font-semibold text-muted uppercase tracking-wider bg-bg-secondary border-b border-border">
        {t("slashMenu.header")}
      </div>
      {/* NOTE: 항목이 `<div onClick>`이고 role이 없어 화살표로 옮겨도 보조기술에는 선택
          위치가 전달되지 않았다. listbox/option으로 노출하고, 포커스가 편집 영역에 남으므로
          `aria-activedescendant`는 그쪽에 붙인다(위 `onActiveOptionChange` 참조). */}
      <div className="p-1" id={SLASH_MENU_LISTBOX_ID} role="listbox" aria-label={t("slashMenu.header")}>
        {items.map((item, index) => (
          <div
            key={item.id}
            id={slashMenuOptionId(index)}
            role="option"
            aria-selected={index === effectiveSelectedIndex}
            className={cn(
              "flex items-center px-2 py-1.5 rounded-control cursor-pointer transition-colors gap-2.5",
              index === effectiveSelectedIndex ? "bg-element" : "hover:bg-hover"
            )}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
          >
            <div className="flex items-center justify-center w-11 h-11 border border-border rounded-control bg-panel text-fg shrink-0">
              {ICONS[item.id]}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium text-fg mb-0.5">{item.label}</div>
              {/* NOTE: `descriptions`에 없는 id는 이전에 빈 줄을 남겨 항목 높이만 차지했다.
                  설명이 없으면 줄 자체를 그리지 않는다. */}
              {descriptions[item.id] && (
                <div className="text-[11px] text-muted truncate">{descriptions[item.id]}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

SlashMenu.displayName = "SlashMenu";

export default SlashMenu;
