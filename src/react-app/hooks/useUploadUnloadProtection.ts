import { useEffect } from "react";

type BeforeUnloadTarget = Pick<Window, "addEventListener" | "removeEventListener">;

type UploadUnloadProtectionOptions = {
  target?: BeforeUnloadTarget;
};

function createUploadUnloadProtection({
  target = window,
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
    },

    stop() {
      if (!isActive) {
        return;
      }

      isActive = false;
      target.removeEventListener("beforeunload", handleBeforeUnload);
    },
  };
}

export function useUploadUnloadProtection(isUploading: boolean) {
  useEffect(() => {
    if (!isUploading || typeof window === "undefined") {
      return;
    }

    const protection = createUploadUnloadProtection();
    protection.start();

    return () => protection.stop();
  }, [isUploading]);
}
