import { useState } from 'react';
import { 
  Bold, Italic, Underline, 
  Heading1, Heading2, Quote,
  Target, Eye
} from 'lucide-react';
import styles from '../../styles/components/EditorToolbar.module.css';

export default function EditorToolbar() {
  const [isFocusMode, setFocusMode] = useState(false);
  const wordCount = 1250;
  const targetCount = 3000;
  const progress = Math.min((wordCount / targetCount) * 100, 100);

  return (
    <div className={styles.toolbar} style={{ position: 'relative' }}>
      <div className={styles.group}>
        <button className={styles.button} title="Bold"><Bold size={18} /></button>
        <button className={styles.button} title="Italic"><Italic size={18} /></button>
        <button className={styles.button} title="Underline"><Underline size={18} /></button>
        
        <div className={styles.separator} />
        
        <button className={styles.button} title="Heading 1"><Heading1 size={18} /></button>
        <button className={styles.button} title="Heading 2"><Heading2 size={18} /></button>
        <button className={styles.button} title="Quote"><Quote size={18} /></button>
      </div>

      <div className={styles.rightGroup}>
        {/* Target Widget */}
        <div className={styles.targetWidget} title={`Current: ${wordCount} / Target: ${targetCount}`}>
           <Target size={14} />
           <div className={styles.progressBarTrack}>
             <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
           </div>
           <span className={styles.targetLabel}>{Math.round(progress)}%</span>
        </div>

        <div className={styles.separator} />

        {/* Focus Mode Toggle */}
        <button 
          className={isFocusMode ? styles.focusToggleActive : styles.focusToggle}
          onClick={() => setFocusMode(!isFocusMode)}
          title="Toggle Focus Mode (Typewriter)"
        >
          <Eye size={14} />
          <span>Focus</span>
        </button>
      </div>
    </div>
  );
}
