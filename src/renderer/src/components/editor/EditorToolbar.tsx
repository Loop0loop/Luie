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
  onFormat?: (type: string) => void;
}

export default function EditorToolbar({ isMobileView, onToggleMobileView, onFormat }: EditorToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {/* Row 1: Common Formatting */}
      <div className={styles.row}>
        {/* Left: History & Font */}
        <div className={styles.tgroup}>
          <button className={styles.iconBtn} title="Undo" onClick={() => onFormat?.('undo')}><Undo2 size={16}/></button>
          <button className={styles.iconBtn} title="Redo" onClick={() => onFormat?.('redo')}><Redo2 size={16}/></button>
          
          <div className={styles.separator} />
          
          {/* Font Picker Fake */}
          <button className={styles.selectBtn}>
            <span>나눔고딕</span>
            <ChevronDown size={12}/>
          </button>
          
          <div className={styles.separator} />
          
          {/* Size Picker Fake */}
          <button className={styles.iconBtn} onClick={() => onFormat?.('size-down')}><span style={{fontSize:14}}>-</span></button>
          <input className={styles.numberInput} defaultValue={16} readOnly />
          <button className={styles.iconBtn} onClick={() => onFormat?.('size-up')}><span style={{fontSize:14}}>+</span></button>
          
          <div className={styles.separator} />

          <button className={styles.iconBtn} title="Bold" onClick={() => onFormat?.('bold')}><Bold size={16}/></button>
          <button className={styles.iconBtn} title="Italic" onClick={() => onFormat?.('italic')}><Italic size={16}/></button>
          <button className={styles.iconBtn} title="Underline" onClick={() => onFormat?.('underline')}><Underline size={16}/></button>
          <button className={styles.iconBtn} title="Strikethrough" onClick={() => onFormat?.('strikethrough')}><Strikethrough size={16}/></button>
          
          <div className={styles.separator} />
          
          <button className={styles.iconBtn} style={{color:'var(--text-primary)'}} title="Text Color" onClick={() => onFormat?.('color')}><Type size={16}/></button>
          <button className={styles.iconBtn} title="Highlight" onClick={() => onFormat?.('highlight')}><Highlighter size={16}/></button>
        </div>

        {/* Right: Align & Mobile Toggle */}
        <div className={styles.tgroup}>
          <button className={styles.iconBtn} title="Align Left" onClick={() => onFormat?.('align-left')}><AlignLeft size={16}/></button>
          <button className={styles.iconBtn} title="Align Center" onClick={() => onFormat?.('align-center')}><AlignCenter size={16}/></button>
          <button className={styles.iconBtn} title="Align Right" onClick={() => onFormat?.('align-right')}><AlignRight size={16}/></button>
          <button className={styles.iconBtn} title="Justify" onClick={() => onFormat?.('align-justify')}><AlignJustify size={16}/></button>
          
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
