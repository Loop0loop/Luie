import type { ReactNode } from "react";
import { useId } from "react";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { cn } from "@shared/types/utils";
import { useTranslation } from "react-i18next";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/**
 * NOTE: Radix Dialog를 쓰는 이유는 두 가지 실제 버그 때문이다.
 *
 * 1. stacking context. 이전에는 `fixed inset-0 z-9999`를 호출 위치에 그대로 렌더했다.
 *    `MainLayout`의 main-content-panel이 `relative z-0`으로 stacking context를 만들기
 *    때문에 z-9999가 그 안에 갇혀, 형제인 sidebar-panel(z-10)과 body로 portal되는
 *    editor toolbar(z-toolbar 120)가 모달 위에 그려지고 클릭까지 됐다.
 * 2. focus. modal 밖으로 Tab이 빠져나가고 Escape·focus 복원이 없었다.
 *
 * Dialog.Portal이 body로 빼내 stacking context를 벗어나고, Dialog.Content가 focus
 * trap·Escape·focus 복원·`aria-modal`을 담당한다. portal은 `.research-surface`의
 * token 평탄화 범위에서도 벗어나므로 Research 안에서 열린 모달의 표면·경계가 살아난다.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width,
}: ModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-modal bg-overlay backdrop-blur-sm" />
        <Dialog.Content
          // NOTE: Dialog.Description을 쓰지 않으므로 Radix의 describedby 경고를 끈다.
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-modal flex w-full -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-panel border border-border bg-panel shadow-panel",
            !width && "max-w-md",
          )}
          style={{
            width: width || undefined,
            maxWidth: width ? "90vw" : undefined,
          }}
        >
          <div className="flex items-center justify-between border-b border-border bg-secondary px-5 py-4">
            <Dialog.Title className="text-[15px] font-semibold text-fg">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={t("common.close")}
                title={t("common.close")}
                className="flex cursor-pointer rounded border-none bg-transparent p-1 text-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="icon-lg" />
              </button>
            </Dialog.Close>
          </div>
          <div className="p-5 text-sm leading-relaxed text-muted">{children}</div>
          {footer && (
            <div className="border-t border-border bg-secondary px-5 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
          <button
            type="button"
            className="px-4 py-2 bg-transparent border border-border rounded-control text-muted text-[13px] cursor-pointer transition-all hover:bg-hover hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onCancel}
          >
            {effectiveCancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-2 border-none rounded-control text-on-accent text-[13px] font-medium cursor-pointer transition-all hover:brightness-110 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              isDestructive ? "bg-destructive" : "bg-accent",
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
          <button
            type="button"
            className="px-4 py-2 bg-transparent border border-border rounded-control text-muted text-[13px] cursor-pointer transition-all hover:bg-hover hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onCancel}
          >
            {effectiveCancelLabel}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-accent border-none rounded-control text-on-accent text-[13px] font-medium cursor-pointer transition-all hover:brightness-110 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleSubmit}
          >
            {effectiveConfirmLabel}
          </button>
        </div>
      }
    >
      {message && <div className="mb-3 text-muted">{message}</div>}
      <label className="sr-only" htmlFor={inputId}>
        {title}
      </label>
      <input
        key={`${isOpen}-${defaultValue}`}
        id={inputId}
        className="w-full p-2.5 bg-input border border-border-strong rounded-control text-sm outline-hidden transition-colors focus:border-accent focus:ring-2 focus:ring-ring"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoFocus
        onKeyDown={(e) => {
          // NOTE: Escape는 Dialog.Content가 처리한다. 여기서 또 onCancel을 부르면
          // 같은 키 입력에 취소가 두 번 실행된다.
          if (e.key === "Enter") handleSubmit();
        }}
      />
    </Modal>
  );
}
