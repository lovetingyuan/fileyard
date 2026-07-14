import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Toaster } from "react-hot-toast";
import { getToastDialogHost, subscribeToToastDialogHost } from "./toastDialogHost";

export function ToastViewport() {
  const dialogHost = useSyncExternalStore(
    subscribeToToastDialogHost,
    getToastDialogHost,
    () => null,
  );
  const toaster = <Toaster position="top-center" toastOptions={{ duration: 5000 }} />;

  return dialogHost ? createPortal(toaster, dialogHost) : toaster;
}
