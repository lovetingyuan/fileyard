import { useEffect, useEffectEvent, useRef } from "react";
import { registerToastDialogHost } from "../components/toastDialogHost";

interface UseNativeDialogOptions {
  isOpen: boolean;
  isDismissDisabled?: boolean;
  onCancel: () => void;
  onAfterOpen?: () => void;
}

function openNativeDialog(dialog: HTMLDialogElement) {
  if (!dialog.open) {
    dialog.showModal();
  }
}

export function useNativeDialog({
  isOpen,
  isDismissDisabled = false,
  onCancel,
  onAfterOpen,
}: UseNativeDialogOptions) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const handleCancel = useEffectEvent((event: Event) => {
    if (isDismissDisabled) {
      event.preventDefault();
      return;
    }

    onCancel();
  });

  const handleAfterOpen = useEffectEvent(() => {
    onAfterOpen?.();
  });

  const setDialogRef = (node: HTMLDialogElement | null) => {
    dialogRef.current = node;
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    openNativeDialog(dialog);
    const unregisterToastHost = registerToastDialogHost(dialog);
    handleAfterOpen();

    const cancelListener = (event: Event) => {
      handleCancel(event);
    };

    dialog.addEventListener("cancel", cancelListener);

    return () => {
      dialog.removeEventListener("cancel", cancelListener);
      if (dialog.open) {
        dialog.close();
      }
      unregisterToastHost();
    };
  }, [isOpen]);

  return setDialogRef;
}
