const EDITABLE_SHORTCUT_TAG_NAMES = new Set(["INPUT", "TEXTAREA", "SELECT"]);

type EditableShortcutTarget = EventTarget & {
  closest?: (selector: string) => Element | null;
  isContentEditable?: boolean;
  tagName?: string;
};

type DashboardSearchShortcutEvent = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey">;

export function isEditableShortcutTarget(target: EventTarget | null) {
  if (!target) {
    return false;
  }

  const element = target as EditableShortcutTarget;
  if (element.tagName && EDITABLE_SHORTCUT_TAG_NAMES.has(element.tagName.toUpperCase())) {
    return true;
  }

  if (element.closest?.("input, textarea, select")) {
    return true;
  }

  if (element.isContentEditable) {
    return true;
  }

  if (element.isContentEditable === false) {
    return false;
  }

  return Boolean(element.closest?.("[contenteditable=''], [contenteditable='true']"));
}

export function shouldFocusDashboardSearchFromShortcut(
  event: DashboardSearchShortcutEvent,
  activeElement: EventTarget | null,
) {
  return (
    event.key === "/" &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !isEditableShortcutTarget(activeElement)
  );
}
