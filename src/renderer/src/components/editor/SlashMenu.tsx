import { useEffect, useState } from 'react';
import styles from '../../styles/components/SlashMenu.module.css';
import { 
  Heading1, Heading2, Heading3, 
  List, CheckSquare, ListOrdered, 
  ChevronRight, Quote, Minus, MessageSquare
} from 'lucide-react';

interface SlashMenuProps {
  position: { top: number; left: number };
  onSelect: (command: string) => void;
  onClose: () => void;
}

const MENU_ITEMS = [
  { id: 'h1', label: '제목 1', icon: <Heading1 size={18} />, description: '장(章) 또는 큰 섹션' },
  { id: 'h2', label: '제목 2', icon: <Heading2 size={18} />, description: '중간 섹션' },
  { id: 'h3', label: '제목 3', icon: <Heading3 size={18} />, description: '세부 섹션' },
  { id: 'bullet', label: '글머리 기호 목록', icon: <List size={18} />, description: '단순 목록 만들기' },
  { id: 'number', label: '번호 매기기 목록', icon: <ListOrdered size={18} />, description: '순서가 있는 목록' },
  { id: 'check', label: '할 일 목록', icon: <CheckSquare size={18} />, description: '체크박스로 진행 관리' },
  { id: 'toggle', label: '토글 섹션', icon: <ChevronRight size={18} />, description: '접고 펼칠 수 있는 섹션' },
  { id: 'quote', label: '인용', icon: <Quote size={18} />, description: '대사/인용문 강조' },
  { id: 'callout', label: '메모(콜아웃)', icon: <MessageSquare size={18} />, description: '주석/메모 박스' },
  { id: 'divider', label: '장면 구분선', icon: <Minus size={18} />, description: '장면 전환 구분' },
];

export default function SlashMenu({ position, onSelect, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow navigation within the menu
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % MENU_ITEMS.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(MENU_ITEMS[selectedIndex].id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Capture phase to prevent editor input
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedIndex, onSelect, onClose]);

  return (
    <div 
      className={styles.menu} 
      style={{ top: position.top, left: position.left }}
    >
      <div className={styles.header}>기본 블록</div>
      <div className={styles.list}>
        {MENU_ITEMS.map((item, index) => (
          <div 
            key={item.id}
            className={`${styles.item} ${index === selectedIndex ? styles.selected : ''}`}
            onClick={() => onSelect(item.id)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className={styles.iconWrapper}>
              {item.icon}
            </div>
            <div className={styles.content}>
              <div className={styles.label}>{item.label}</div>
              <div className={styles.desc}>{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
