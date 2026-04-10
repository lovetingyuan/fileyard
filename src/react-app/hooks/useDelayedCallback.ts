import { useEffect } from "react";

export function useDelayedCallback(callback: () => void, delay: number, enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const timeout = window.setTimeout(callback, delay);
    return () => window.clearTimeout(timeout);
  }, [callback, delay, enabled]);
}
