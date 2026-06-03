export type DialogClosedBy = "closerequest" | "none";

export function getDialogClosedBy(isInteractionDisabled: boolean): DialogClosedBy {
  return isInteractionDisabled ? "none" : "closerequest";
}
