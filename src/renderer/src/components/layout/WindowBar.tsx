import styles from '../../styles/layout/WindowBar.module.css';
import { APP_NAME } from "../../../shared/constants";

interface WindowBarProps {
  title?: string;
}

export default function WindowBar({ title = APP_NAME }: WindowBarProps) {
  return (
    <div className={styles.windowBar}>
      <span className={styles.title}>{title}</span>
    </div>
  );
}
