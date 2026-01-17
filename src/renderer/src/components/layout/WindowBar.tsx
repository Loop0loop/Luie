import styles from '../../styles/layout/WindowBar.module.css';

interface WindowBarProps {
  title?: string;
}

export default function WindowBar({ title = "Luie" }: WindowBarProps) {
  return (
    <div className={styles.windowBar}>
      <span className={styles.title}>{title}</span>
    </div>
  );
}
