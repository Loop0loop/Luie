import { 
  Bold, Italic, Underline, 
  Heading1, Heading2, Quote 
} from 'lucide-react';
import styles from '../../styles/components/EditorToolbar.module.css';

export default function EditorToolbar() {
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
    </div>
  );
}
