import { useEffect, useState } from 'react';
import styles from '../../styles/components/SlashMenu.module.css';
import { 
  Heading1, Heading2, Heading3, 
  List, CheckSquare, ListOrdered, 
  ChevronRight, Quote, Minus
} from 'lucide-react';

interface SlashMenuProps {
  position: { top: number; left: number };
  onSelect: (command: string) => void;
  onClose: () => void;
}

const MENU_ITEMS = [
  { id: 'h1', label: '제목 1', icon: <Heading1 size={18} />, description: '섹션의 큰 제목' },
  { id: 'h2', label: '제목 2', icon: <Heading2 size={18} />, description: '섹션의 중간 제목' },
  { id: 'h3', label: '제목 3', icon: <Heading3 size={18} />, description: '섹션의 작은 제목' },
  { id: 'bullet', label: '글머리 기호 목록', icon: <List size={18} />, description: '단순 목록 만들기' },
  { id: 'number', label: '번호 매기기 목록', icon: <ListOrdered size={18} />, description: '순서가 있는 목록' },
  { id: 'check', label: '할 일 목록', icon: <CheckSquare size={18} />, description: '체크박스로 할 일 관리' },
  { id: 'toggle', label: '토글 목록', icon: <ChevronRight size={18} />, description: '내용을 접고 펼치기' },
  { id: 'quote', label: '인용', icon: <Quote size={18} />, description: '인용문 캡처' },
  { id: 'callout', label: '콜아웃', icon: <Quote size={18} />, description: '두드러진 텍스트 상자' },
  { id: 'divider', label: '구분선', icon: <Minus size={18} />, description: '섹션을 시각적으로 분리' },
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
