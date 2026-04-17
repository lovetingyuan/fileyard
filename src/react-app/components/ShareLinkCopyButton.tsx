interface ShareLinkCopyButtonProps {
  isCopied: boolean;
  onClick: () => void;
}

export function ShareLinkCopyButton({ isCopied, onClick }: ShareLinkCopyButtonProps) {
  const buttonClassName = isCopied
    ? "btn btn-success btn-sm shrink-0 transition-colors duration-200"
    : "btn btn-ghost btn-sm shrink-0 transition-colors duration-200";

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={onClick}
      data-copy-state={isCopied ? "copied" : "idle"}
      aria-live="polite"
    >
      {isCopied ? "已复制" : "复制"}
    </button>
  );
}
