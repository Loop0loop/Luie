import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { Editor, Range } from "@tiptap/core";
import styles from "../../styles/components/SlashMenu.module.css";
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
  ICON_SIZE_LG,
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
  h1: <Heading1 size={ICON_SIZE_LG} />,
  h2: <Heading2 size={ICON_SIZE_LG} />,
  h3: <Heading3 size={ICON_SIZE_LG} />,
  bullet: <List size={ICON_SIZE_LG} />,
  number: <ListOrdered size={ICON_SIZE_LG} />,
  check: <CheckSquare size={ICON_SIZE_LG} />,
  toggle: <ChevronRight size={ICON_SIZE_LG} />,
  quote: <Quote size={ICON_SIZE_LG} />,
  callout: <MessageSquare size={ICON_SIZE_LG} />,
  divider: <Minus size={ICON_SIZE_LG} />,
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
      className={styles.menu}
      onMouseDown={(e) => {
        // 클릭/드래그가 에디터 focus를 빼앗아 Suggestion이 닫히는 걸 방지
        e.preventDefault();
      }}
    >
      <div className={styles.header}>{SLASH_MENU_HEADER_BASIC}</div>
      <div className={styles.list}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`${styles.item} ${index === effectiveSelectedIndex ? styles.selected : ""}`}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
          >
            <div className={styles.iconWrapper}>{ICONS[item.id]}</div>
            <div className={styles.content}>
              <div className={styles.label}>{item.label}</div>
              <div className={styles.desc}>{DESCRIPTIONS[item.id] || ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

SlashMenu.displayName = "SlashMenu";

export default SlashMenu;
