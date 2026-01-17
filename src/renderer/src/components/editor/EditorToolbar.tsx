import { 
  Undo2, Redo2, 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Type, MoreVertical,
  Smartphone, Monitor, ChevronDown
} from 'lucide-react';
import styles from '../../styles/components/EditorToolbar.module.css';

interface EditorToolbarProps {
  isMobileView?: boolean;
  onToggleMobileView?: () => void;
}

export default function EditorToolbar({ isMobileView, onToggleMobileView }: EditorToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {/* Row 1: Common Formatting */}
      <div className={styles.row}>
        {/* Left: History & Font */}
        <div className={styles.tgroup}>
          <button className={styles.iconBtn} title="Undo"><Undo2 size={16}/></button>
          <button className={styles.iconBtn} title="Redo"><Redo2 size={16}/></button>
          
          <div className={styles.separator} />
          
          {/* Font Picker Fake */}
          <button className={styles.selectBtn}>
            <span>나눔고딕</span>
            <ChevronDown size={12}/>
          </button>
          
          <div className={styles.separator} />
          
          {/* Size Picker Fake */}
          <button className={styles.iconBtn}><span style={{fontSize:14}}>-</span></button>
          <input className={styles.numberInput} defaultValue={16} />
          <button className={styles.iconBtn}><span style={{fontSize:14}}>+</span></button>
          
          <div className={styles.separator} />

          <button className={styles.iconBtn} title="Bold"><Bold size={16}/></button>
          <button className={styles.iconBtn} title="Italic"><Italic size={16}/></button>
          <button className={styles.iconBtn} title="Underline"><Underline size={16}/></button>
          <button className={styles.iconBtn} title="Strikethrough"><Strikethrough size={16}/></button>
          
          <div className={styles.separator} />
          
          <button className={styles.iconBtn} style={{color:'var(--text-primary)'}} title="Text Color"><Type size={16}/></button>
          <button className={styles.iconBtn} title="Highlight"><Highlighter size={16}/></button>
        </div>

        {/* Right: Align & Mobile Toggle */}
        <div className={styles.tgroup}>
          <button className={styles.iconBtn} title="Align Left"><AlignLeft size={16}/></button>
          <button className={styles.iconBtn} title="Align Center"><AlignCenter size={16}/></button>
          <button className={styles.iconBtn} title="Align Right"><AlignRight size={16}/></button>
          <button className={styles.iconBtn} title="Justify"><AlignJustify size={16}/></button>
          
          <div className={styles.separator} />
          
          <button 
            className={styles.mobileToggle} 
            data-active={isMobileView}
            onClick={onToggleMobileView}
            title="Toggle Mobile Typesetting View"
          >
            {isMobileView ? <Smartphone size={14} /> : <Monitor size={14} />}
            <span>{isMobileView ? 'Mobile' : 'PC'}</span>
          </button>

          <button className={styles.iconBtn}><MoreVertical size={16}/></button>
        </div>
      </div>
    </div>
  );
}
