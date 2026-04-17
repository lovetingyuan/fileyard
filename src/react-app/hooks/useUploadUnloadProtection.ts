import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

export const UPLOAD_UNLOAD_TOAST_ID = "dashboard-upload-unload-warning";
export const UPLOAD_UNLOAD_TOAST_MESSAGE =
  "Upload in progress. Closing this page will cancel it.";

type BeforeUnloadTarget = Pick<Window, "addEventListener" | "removeEventListener">;
type UploadUnloadToaster = Pick<typeof toast, "loading" | "dismiss">;

type UploadUnloadProtectionOptions = {
  target?: BeforeUnloadTarget;
  toaster?: UploadUnloadToaster;
};

export function createUploadUnloadProtection({
  target = window,
  toaster = toast,
}: UploadUnloadProtectionOptions = {}) {
  let isActive = false;

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = "";
  };

  return {
    start() {
      if (isActive) {
        return;
      }

      isActive = true;
      target.addEventListener("beforeunload", handleBeforeUnload);
      toaster.loading(UPLOAD_UNLOAD_TOAST_MESSAGE, { id: UPLOAD_UNLOAD_TOAST_ID });
    },

    stop() {
      if (!isActive) {
        return;
      }

      isActive = false;
      target.removeEventListener("beforeunload", handleBeforeUnload);
      toaster.dismiss(UPLOAD_UNLOAD_TOAST_ID);
    },
  };
}

export function useUploadUnloadProtection(isUploading: boolean) {
  const protectionRef = useRef<ReturnType<typeof createUploadUnloadProtection> | null>(null);

  if (protectionRef.current === null && typeof window !== "undefined") {
    protectionRef.current = createUploadUnloadProtection();
  }

  useEffect(() => {
    const protection = protectionRef.current;
    if (!protection) {
      return;
    }

    if (isUploading) {
      protection.start();
      return () => protection.stop();
    }

    protection.stop();
  }, [isUploading]);
}
