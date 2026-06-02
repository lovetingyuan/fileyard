import { useRef } from "react";
import type { BatchOperationTarget } from "../../../../types";
import { useAppStore } from "../../../store";
import { toggleDashboardSelection } from "../actions";

const LONG_PRESS_SELECTION_MS = 500;

function getDashboardSelectionKey(target: Pick<BatchOperationTarget, "path" | "type">): string {
  return `${target.type}:${target.path}`;
}

export function useDashboardEntrySelection(target: BatchOperationTarget) {
  const { selectedDashboardTargets } = useAppStore();
  const longPressTimerRef = useRef<number | null>(null);
  const shouldIgnoreNextOpenRef = useRef(false);
  const targetKey = getDashboardSelectionKey(target);
  const isSelectionActive = selectedDashboardTargets.length > 0;
  const isSelected = selectedDashboardTargets.some(
    (selectedTarget) => getDashboardSelectionKey(selectedTarget) === targetKey,
  );

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPressTimer = () => {
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      shouldIgnoreNextOpenRef.current = true;
      if (!isSelected) {
        toggleDashboardSelection(target);
      }
    }, LONG_PRESS_SELECTION_MS);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") {
      return;
    }

    startLongPressTimer();
  };

  const handlePointerEnd = () => {
    clearLongPressTimer();
  };

  const handleSelectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    toggleDashboardSelection(target);
  };

  const handleSelectionClick = (event: React.MouseEvent<HTMLInputElement>) => {
    event.stopPropagation();
  };

  const consumeIgnoredClick = () => {
    if (!shouldIgnoreNextOpenRef.current) {
      return false;
    }

    shouldIgnoreNextOpenRef.current = false;
    return true;
  };

  const handleActiveSelectionClick = (event: React.MouseEvent) => {
    if (!isSelectionActive) {
      return false;
    }

    event.stopPropagation();
    if (!consumeIgnoredClick()) {
      toggleDashboardSelection(target);
    }
    return true;
  };

  const shouldIgnoreEntryOpen = () => {
    if (isSelectionActive) {
      return true;
    }

    if (consumeIgnoredClick()) {
      return true;
    }

    return false;
  };

  return {
    entryKey: targetKey,
    handleActiveSelectionClick,
    handlePointerDown,
    handlePointerEnd,
    handleSelectionChange,
    handleSelectionClick,
    isSelected,
    isSelectionActive,
    shouldIgnoreEntryOpen,
  };
}
