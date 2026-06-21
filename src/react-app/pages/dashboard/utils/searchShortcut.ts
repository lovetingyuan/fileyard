const EDITABLE_SHORTCUT_TAG_NAMES = new Set(["INPUT", "TEXTAREA", "SELECT"]);

type EditableShortcutTarget = EventTarget & {
  closest?: (selector: string) => Element | null;
  isContentEditable?: boolean;
  tagName?: string;
};

type DashboardSearchShortcutEvent = Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey">;

type DashboardSelectionEscapeEvent = Pick<KeyboardEvent, "key" | "target">;

type DialogShortcutTarget = EventTarget & {
  closest?: (selector: string) => Element | null;
  tagName?: string;
};

function isEditableShortcutTarget(target: EventTarget | null) {
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

function isDialogShortcutTarget(target: EventTarget | null) {
  if (!target) {
    return false;
  }

  const element = target as DialogShortcutTarget;
  if (element.tagName?.toUpperCase() === "DIALOG") {
    return true;
  }

  return Boolean(element.closest?.("dialog"));
}

export function shouldClearDashboardSelectionFromEscape(
  event: DashboardSelectionEscapeEvent,
  isSelectionActive: boolean,
  root: Pick<Document, "querySelector">,
) {
  if (event.key !== "Escape" || !isSelectionActive) {
    return false;
  }

  if (root.querySelector("dialog[open]")) {
    return false;
  }

  return !isDialogShortcutTarget(event.target);
}
