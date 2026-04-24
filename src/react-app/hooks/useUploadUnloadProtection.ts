import { useEffect, useRef } from "react";

type BeforeUnloadTarget = Pick<Window, "addEventListener" | "removeEventListener">;

type UploadUnloadProtectionOptions = {
  target?: BeforeUnloadTarget;
};

export function createUploadUnloadProtection({
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
