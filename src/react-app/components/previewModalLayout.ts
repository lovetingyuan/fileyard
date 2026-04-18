import type { PreviewKind } from "../utils/previewInfo";

export type DialogWidthMode = "default" | "content";
const DOCUMENT_VIEWPORT_CLASS = "mx-auto w-[min(48rem,calc(95vw-4rem))] max-w-full";

export function getDialogBoxClassName(widthMode: DialogWidthMode, boxClassName = ""): string {
  const classes = ["modal-box"];

  if (widthMode === "content") {
    classes.push("!w-fit");
  }

  if (boxClassName) {
    classes.push(boxClassName);
  }

  return classes.join(" ");
}

export function getPreviewModalBoxClassName(isFullscreen = false): string {
  if (isFullscreen) {
    return "flex h-[100dvh] w-screen !max-h-none !max-w-none flex-col rounded-none";
  }

  return "flex max-h-[95vh] min-w-[min(32rem,95vw)] !max-w-[95vw] flex-col";
}

export function getPreviewContentWrapperClassName(
  kind: PreviewKind,
  isEditing: boolean,
  isFullscreen = false,
): string {
  if (isFullscreen) {
    if (isEditing) {
      return "flex h-full w-full min-w-0";
    }

    if (kind === "pdf" || kind === "text") {
      return "h-full w-full";
    }

    return "flex h-full w-full items-center justify-center";
  }

  if (isEditing) {
    return "w-full min-w-0";
  }

  if (kind === "pdf" || kind === "text") {
    return DOCUMENT_VIEWPORT_CLASS;
  }

  return "mx-auto w-fit max-w-full";
}

export const STANDARD_VIDEO_CLASS_NAME = "max-h-[65vh] max-w-full rounded";
export const STANDARD_AUDIO_CLASS_NAME = "max-w-full";
export const STANDARD_PDF_CLASS_NAME = "w-full rounded border-0 h-[70vh]";
export const STANDARD_TEXT_CLASS_NAME =
  "w-full overflow-auto text-sm bg-base-200 rounded-box p-4 whitespace-pre max-h-[60vh]";
