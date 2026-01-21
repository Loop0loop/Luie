import { useEffect, useState } from "react";
import { X } from "lucide-react";
import styles from "../../styles/components/Modal.module.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = "400px",
}: ModalProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnimate(true);
      return;
    } else {
      const timer = setTimeout(() => setAnimate(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !animate) return null;

  return (
    <div
      className={`${styles.overlay} ${isOpen ? styles.open : ""}`}
      onMouseDown={onClose}
    >
      <div
        className={`${styles.dialog} ${isOpen ? styles.open : ""}`}
        style={{ width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className={styles.confirmMessage}>{message}</div>
      <div className={styles.footerButtons}>
        <button className={styles.buttonSecondary} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          className={`${styles.buttonPrimary} ${isDestructive ? styles.destructive : ""}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  isOpen,
  title,
  message,
  defaultValue = "",
  placeholder = "",
  confirmLabel = "확인",
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  const handleSubmit = () => {
    onConfirm(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      {message && <div className={styles.promptMessage}>{message}</div>}
      <input
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        autoFocus
      />
      <div className={styles.footerButtons}>
        <button className={styles.buttonSecondary} onClick={onCancel}>
          취소
        </button>
        <button className={styles.buttonPrimary} onClick={handleSubmit}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
