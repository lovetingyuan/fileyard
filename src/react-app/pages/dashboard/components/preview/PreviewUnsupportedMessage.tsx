import MdiFileAlertOutline from "~icons/mdi/file-alert-outline";

export function PreviewUnsupportedMessage({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-base-content/60">
      <MdiFileAlertOutline className="w-12 h-12" />
      <p className="text-sm text-center">{reason}</p>
    </div>
  );
}
