import type { ReactNode } from "react";
import { useId } from "react";
import { X } from "lucide-react";
import styles from "../../styles/components/Modal.module.css";
import { ICON_SIZE_LG } from "../../../shared/constants";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className={`${styles.overlay} ${styles.open}`} onMouseDown={onClose}>
      <div
        className={`${styles.dialog} ${styles.open}`}
        style={{ width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={ICON_SIZE_LG} />
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
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <div className={styles.footerButtons}>
          <button className={styles.buttonSecondary} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={isDestructive ? styles.buttonDanger : styles.buttonPrimary}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className={styles.confirmMessage}>{message}</div>
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
  cancelLabel?: string;
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
  cancelLabel = "취소",
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const inputId = useId();

  const handleSubmit = () => {
    const el = document.getElementById(inputId) as HTMLInputElement | null;
    onConfirm((el?.value ?? defaultValue).trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <div className={styles.footerButtons}>
          <button className={styles.buttonSecondary} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={styles.buttonPrimary} onClick={handleSubmit}>
            {confirmLabel}
          </button>
        </div>
      }
    >
      {message && <div className={styles.promptMessage}>{message}</div>}
      <input
        key={`${isOpen}-${defaultValue}`}
        id={inputId}
        className={styles.input}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
      />
    </Modal>
  );
}
