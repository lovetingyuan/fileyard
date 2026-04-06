import { useCallback, useEffect, useEffectEvent, useRef } from "react";

interface UseNativeDialogOptions {
  isOpen: boolean;
  isDismissDisabled?: boolean;
  onCancel: () => void;
}

export function useNativeDialog({
  isOpen,
  isDismissDisabled = false,
  onCancel,
}: UseNativeDialogOptions) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const handleCancel = useEffectEvent((event: Event) => {
    if (isDismissDisabled) {
      event.preventDefault();
      return;
    }

    onCancel();
  });

  const setDialogRef = useCallback((node: HTMLDialogElement | null) => {
    dialogRef.current = node;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    const cancelListener = (event: Event) => {
      handleCancel(event);
    };

    dialog.addEventListener("cancel", cancelListener);

    return () => {
      dialog.removeEventListener("cancel", cancelListener);
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  return setDialogRef;
}
