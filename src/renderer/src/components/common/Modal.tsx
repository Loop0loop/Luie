import type { ReactNode } from "react";
import { useId } from "react";
import { X } from "lucide-react";
import { cn } from "../../../../shared/types/utils";
import { useTranslation } from "react-i18next";

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
    <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-200" onMouseDown={onClose}>
      <div
        className="bg-panel border border-border rounded-xl shadow-2xl w-full max-w-[90vw] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
        style={{ width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary">
          <div className="text-[15px] font-semibold text-fg">{title}</div>
          <button className="bg-transparent border-none text-muted cursor-pointer p-1 rounded flex hover:bg-hover hover:text-fg transition-colors" onClick={onClose}>
            <X className="icon-lg" />
          </button>
        </div>
        <div className="p-5 text-sm leading-relaxed text-muted">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-border bg-secondary">{footer}</div>}
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
  confirmLabel,
  cancelLabel,
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const effectiveConfirmLabel = confirmLabel ?? t("ui.modal.confirm");
  const effectiveCancelLabel = cancelLabel ?? t("ui.modal.cancel");
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button className="px-4 py-2 bg-transparent border border-border rounded-md text-muted text-[13px] cursor-pointer transition-all hover:bg-hover hover:text-fg" onClick={onCancel}>
            {effectiveCancelLabel}
          </button>
          <button
            className={cn(
              "px-4 py-2 border-none rounded-md text-white text-[13px] font-medium cursor-pointer transition-all hover:brightness-110",
              isDestructive ? "bg-red-500 hover:bg-red-600" : "bg-accent"
            )}
            onClick={onConfirm}
          >
            {effectiveConfirmLabel}
          </button>
        </div>
      }
    >
      <div className="mb-2">{message}</div>
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
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const { t } = useTranslation();
  const effectiveConfirmLabel = confirmLabel ?? t("ui.modal.confirm");
  const effectiveCancelLabel = cancelLabel ?? t("ui.modal.cancel");
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
        <div className="flex justify-end gap-3 w-full">
          <button className="px-4 py-2 bg-transparent border border-border rounded-md text-muted text-[13px] cursor-pointer transition-all hover:bg-hover hover:text-fg" onClick={onCancel}>
            {effectiveCancelLabel}
          </button>
          <button className="px-4 py-2 bg-accent border-none rounded-md text-white text-[13px] font-medium cursor-pointer transition-all hover:brightness-110" onClick={handleSubmit}>
            {effectiveConfirmLabel}
          </button>
        </div>
      }
    >
      {message && <div className="mb-3 text-muted">{message}</div>}
      <input
        key={`${isOpen}-${defaultValue}`}
        id={inputId}
        className="w-full p-2.5 bg-input border border-border rounded-md text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
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
