import MdiCheck from "~icons/mdi/check";
import MdiContentCopy from "~icons/mdi/content-copy";

interface PreviewCopyTextButtonProps {
  disabled: boolean;
  isCopied: boolean;
  onClick: () => void;
}

export function PreviewCopyTextButton({
  disabled,
  isCopied,
  onClick,
}: PreviewCopyTextButtonProps) {
  const Icon = isCopied ? MdiCheck : MdiContentCopy;

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm min-w-24 transition-colors duration-200 ${isCopied ? "text-success" : ""}`}
      onClick={onClick}
      disabled={disabled}
      data-copy-state={isCopied ? "copied" : "idle"}
      aria-label={isCopied ? "文本已复制" : undefined}
      aria-live="polite"
    >
      <Icon className="w-4 h-4" />
      {isCopied ? "已复制" : "复制文本"}
    </button>
  );
}
