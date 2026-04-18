interface ShareLinkCopyButtonProps {
  isCopied: boolean;
  onClick: () => void;
}

export function ShareLinkCopyButton({ isCopied, onClick }: ShareLinkCopyButtonProps) {
  const buttonClassName = "btn btn-ghost btn-sm shrink-0 transition-colors duration-200";

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={onClick}
      data-copy-state={isCopied ? "copied" : "idle"}
      aria-label={isCopied ? "已复制" : undefined}
      aria-live="polite"
    >
      {isCopied ? (
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-success"
          data-testid="copy-success-icon"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path d="m5 12 4 4L19 6" />
        </svg>
      ) : (
        "复制"
      )}
    </button>
  );
}
