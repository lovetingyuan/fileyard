import { useCallback, useEffect, useRef } from "react";
import type { UploadQueueItem } from "../../../../types";
import { getUploadQueuePanelState } from "./uploadQueueUtils";

const SUCCESS_PANEL_DISMISS_DELAY_MS = 1600;

type MutableValueRef<T> = {
  current: T;
};

type UseUploadQueuePanelDismissArgs = {
  itemsRef: MutableValueRef<UploadQueueItem[]>;
  setIsUploadPanelMinimized: (value: boolean) => void;
  setUploadQueue: (items: UploadQueueItem[]) => void;
};

export function useUploadQueuePanelDismiss({
  itemsRef,
  setIsUploadPanelMinimized,
  setUploadQueue,
}: UseUploadQueuePanelDismissArgs) {
  const successDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSuccessDismissTimer = useCallback(() => {
    if (!successDismissTimerRef.current) {
      return;
    }
    clearTimeout(successDismissTimerRef.current);
    successDismissTimerRef.current = null;
  }, []);

  const scheduleSuccessfulPanelDismiss = useCallback(() => {
    const panelState = getUploadQueuePanelState(itemsRef.current);
    if (!panelState.isComplete || panelState.hasTerminalIssues) {
      return;
    }

    clearSuccessDismissTimer();
    successDismissTimerRef.current = setTimeout(() => {
      const latestPanelState = getUploadQueuePanelState(itemsRef.current);
      if (!latestPanelState.isComplete || latestPanelState.hasTerminalIssues) {
        return;
      }
      itemsRef.current = [];
      setUploadQueue([]);
      setIsUploadPanelMinimized(false);
      successDismissTimerRef.current = null;
    }, SUCCESS_PANEL_DISMISS_DELAY_MS);
  }, [clearSuccessDismissTimer, itemsRef, setIsUploadPanelMinimized, setUploadQueue]);

  useEffect(() => {
    return clearSuccessDismissTimer;
  }, [clearSuccessDismissTimer]);

  return { clearSuccessDismissTimer, scheduleSuccessfulPanelDismiss };
}
