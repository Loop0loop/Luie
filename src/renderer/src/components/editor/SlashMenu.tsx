import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ReactElement } from "react";
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

export interface SlashMenuItem {
  id: string;
  label: string;
  action: (props: unknown) => void;
}

export interface SlashMenuHandle {
  onKeyDown: (args: { event: KeyboardEvent }) => boolean;
}

interface SlashMenuProps {
  items: SlashMenuItem[];
  command: (item: SlashMenuItem) => void;
}

const ICONS: Record<string, ReactElement> = {
  h1: <Heading1 size={18} />,
  h2: <Heading2 size={18} />,
  h3: <Heading3 size={18} />,
  bullet: <List size={18} />,
  number: <ListOrdered size={18} />,
  check: <CheckSquare size={18} />,
  toggle: <ChevronRight size={18} />,
  quote: <Quote size={18} />,
  callout: <MessageSquare size={18} />,
  divider: <Minus size={18} />,
};

const DESCRIPTIONS: Record<string, string> = {
  h1: "장(章) 또는 큰 섹션",
  h2: "중간 섹션",
  h3: "세부 섹션",
  bullet: "단순 목록 만들기",
  number: "순서가 있는 목록",
  check: "체크박스로 진행 관리",
  toggle: "접고 펼칠 수 있는 섹션",
  quote: "대사/인용문 강조",
  callout: "주석/메모 박스",
  divider: "장면 전환 구분",
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
      <div className={styles.header}>기본 블록</div>
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
