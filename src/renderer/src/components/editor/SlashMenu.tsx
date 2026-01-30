import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { Editor, Range } from "@tiptap/core";
import { cn } from "../../../../shared/types/utils";
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
import {
  SLASH_MENU_HEADER_BASIC,
  SLASH_MENU_DESC_H1,
  SLASH_MENU_DESC_H2,
  SLASH_MENU_DESC_H3,
  SLASH_MENU_DESC_BULLET,
  SLASH_MENU_DESC_NUMBER,
  SLASH_MENU_DESC_CHECK,
  SLASH_MENU_DESC_TOGGLE,
  SLASH_MENU_DESC_QUOTE,
  SLASH_MENU_DESC_CALLOUT,
  SLASH_MENU_DESC_DIVIDER,
} from "../../../../shared/constants";

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

const DESCRIPTIONS: Record<string, string> = {
  h1: SLASH_MENU_DESC_H1,
  h2: SLASH_MENU_DESC_H2,
  h3: SLASH_MENU_DESC_H3,
  bullet: SLASH_MENU_DESC_BULLET,
  number: SLASH_MENU_DESC_NUMBER,
  check: SLASH_MENU_DESC_CHECK,
  toggle: SLASH_MENU_DESC_TOGGLE,
  quote: SLASH_MENU_DESC_QUOTE,
  callout: SLASH_MENU_DESC_CALLOUT,
  divider: SLASH_MENU_DESC_DIVIDER,
};

const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, command }: SlashMenuProps,
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

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
      className="absolute w-[300px] max-h-[320px] bg-panel border border-border rounded-md shadow-xl z-50 overflow-y-auto flex flex-col font-sans"
      onMouseDown={(e) => {
        // 클릭/드래그가 에디터 focus를 빼앗아 Suggestion이 닫히는 걸 방지
        e.preventDefault();
      }}
    >
      <div className="px-3 py-2 text-[11px] font-semibold text-muted uppercase tracking-wider bg-bg-secondary border-b border-border">
        {SLASH_MENU_HEADER_BASIC}
      </div>
      <div className="p-1">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center px-2 py-1.5 rounded cursor-pointer transition-colors gap-2.5",
              index === effectiveSelectedIndex ? "bg-active" : "hover:bg-hover"
            )}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
          >
            <div className="flex items-center justify-center w-11 h-11 border border-border rounded bg-panel text-fg shrink-0">
              {ICONS[item.id]}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium text-fg mb-0.5">{item.label}</div>
              <div className="text-[11px] text-muted truncate">{DESCRIPTIONS[item.id] || ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

SlashMenu.displayName = "SlashMenu";

export default SlashMenu;
