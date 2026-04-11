import { Icon } from "@iconify/react";
import { type ReactNode, useEffect, useState } from "react";
import { useNativeDialog } from "../hooks/useNativeDialog";
import { getDialogBoxClassName, type DialogWidthMode } from "./previewModalLayout";

type DialogAction = () => void | Promise<void>;

export interface DialogRenderState {
  isConfirming: boolean;
  isInteractionDisabled: boolean;
  requestClose: () => void;
  cancel: () => void;
  confirm: () => Promise<void>;
}

type DialogSlot = ReactNode | ((state: DialogRenderState) => ReactNode);

interface DialogProps {
  isOpen: boolean;
  title?: ReactNode;
  children: DialogSlot;
  footer?: DialogSlot;
  headerActions?: DialogSlot;
  onClose: () => void;
  onCancel?: () => void;
  onConfirm?: DialogAction;
  cancelText?: string;
  confirmText?: string;
  confirmPendingText?: string;
  confirmLoadingText?: string;
  showCancelButton?: boolean;
  showConfirmButton?: boolean;
  showCloseButton?: boolean;
  isDismissDisabled?: boolean;
  cancelDisabled?: boolean;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  widthMode?: DialogWidthMode;
  dialogClassName?: string;
  boxClassName?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  titleClassName?: string;
  closeButtonAriaLabel?: string;
  closeButtonClassName?: string;
  cancelButtonClassName?: string;
  confirmButtonClassName?: string;
}

function renderSlot(slot: DialogSlot | undefined, state: DialogRenderState) {
  if (typeof slot === "function") {
    return slot(state);
  }

  return slot ?? null;
}

export function Dialog({
  isOpen,
  title,
  children,
  footer,
  headerActions,
  onClose,
  onCancel,
  onConfirm,
  cancelText = "取消",
  confirmText = "确定",
  confirmPendingText,
  confirmLoadingText,
  showCancelButton = true,
  showConfirmButton = true,
  showCloseButton = true,
  isDismissDisabled = false,
  cancelDisabled = false,
  confirmDisabled = false,
  confirmLoading = false,
  widthMode = "default",
  dialogClassName = "",
  boxClassName = "",
  bodyClassName = "",
  headerClassName = "",
  footerClassName = "",
  titleClassName = "",
  closeButtonAriaLabel = "关闭弹窗",
  closeButtonClassName = "",
  cancelButtonClassName = "",
  confirmButtonClassName = "",
}: DialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const isInteractionDisabled = isDismissDisabled || isConfirming;

  useEffect(() => {
    if (!isOpen) {
      setIsConfirming(false);
    }
  }, [isOpen]);

  const requestClose = () => {
    if (isInteractionDisabled) {
      return;
    }
    onClose();
  };

  const cancel = () => {
    if (isInteractionDisabled || cancelDisabled) {
      return;
    }
    onCancel?.();
    onClose();
  };

  const confirm = async () => {
    if (!onConfirm || isConfirming || confirmDisabled || confirmLoading) {
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const dialogRef = useNativeDialog({
    isOpen,
    isDismissDisabled: isInteractionDisabled,
    onCancel: requestClose,
  });

  if (!isOpen) {
    return null;
  }

  const renderState: DialogRenderState = {
    isConfirming,
    isInteractionDisabled,
    requestClose,
    cancel,
    confirm,
  };

  const shouldRenderFooter =
    footer !== undefined || showCancelButton || (showConfirmButton && Boolean(onConfirm));
  const confirmLabel = isConfirming
    ? (confirmPendingText ?? confirmText)
    : confirmLoading
      ? (confirmLoadingText ?? confirmText)
      : confirmText;

  return (
    <dialog ref={dialogRef} className={`modal ${dialogClassName}`.trim()}>
      <div className={getDialogBoxClassName(widthMode, boxClassName)}>
        {(title || showCloseButton || headerActions !== undefined) && (
          <div className={`mb-4 flex items-center justify-between gap-4 ${headerClassName}`.trim()}>
            <div className="min-w-0 flex-1">
              {typeof title === "string" ? (
                <h3 className={`font-bold text-base ${titleClassName}`.trim()}>{title}</h3>
              ) : (
                title
              )}
            </div>
            <div className="flex items-center gap-2">
              {headerActions !== undefined ? renderSlot(headerActions, renderState) : null}
              {showCloseButton && (
                <button
                  type="button"
                  className={`btn btn-ghost btn-sm btn-square ${closeButtonClassName}`.trim()}
                  onClick={requestClose}
                  disabled={isInteractionDisabled}
                  aria-label={closeButtonAriaLabel}
                >
                  <Icon icon="mdi:close" className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className={bodyClassName}>{renderSlot(children, renderState)}</div>

        {shouldRenderFooter && (
          <div className={`modal-action ${footerClassName}`.trim()}>
            {footer !== undefined ? (
              renderSlot(footer, renderState)
            ) : (
              <>
                {showCancelButton && (
                  <button
                    type="button"
                    className={(cancelButtonClassName || "btn btn-sm btn-ghost").trim()}
                    onClick={cancel}
                    disabled={isInteractionDisabled || cancelDisabled}
                  >
                    {cancelText}
                  </button>
                )}
                {showConfirmButton && onConfirm && (
                  <button
                    type="button"
                    className={`${(confirmButtonClassName || "btn btn-sm btn-primary").trim()} ${confirmLoading || isConfirming ? "loading" : ""}`.trim()}
                    onClick={() => void confirm()}
                    disabled={isConfirming || confirmLoading || confirmDisabled}
                  >
                    {confirmLabel}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" onClick={requestClose} disabled={isInteractionDisabled}>
          close
        </button>
      </form>
    </dialog>
  );
}
