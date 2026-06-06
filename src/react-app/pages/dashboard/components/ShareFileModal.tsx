import { useRef, useState, type ComponentType, type CSSProperties } from "react";
import QRCodeImport from "react-qr-code";
import toast from "react-hot-toast";
import type { ShareDurationOption, ShareLinkResponse } from "../../../../types";
import { Dialog } from "../../../components/Dialog";
import { ShareLinkCopyButton } from "../../../components/ShareLinkCopyButton";
import { useCreateShareLinkMutation } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import { getSharePasswordError, normalizeSharePassword } from "../../../utils/sharePassword";
import {
  formatShareDuration,
  formatShareExpiry,
  shareDurationOptions,
} from "../../../utils/shareDurations";
import { closeFileShare } from "../actions";

type QRCodeComponentProps = {
  value: string;
  size?: number;
  className?: string;
  bgColor?: string;
  fgColor?: string;
  style?: CSSProperties;
};

const DEFAULT_SHARE_DURATION: ShareDurationOption = 3600;
const QRCode = ((QRCodeImport as unknown as { QRCode?: unknown; default?: unknown }).QRCode ??
  (QRCodeImport as unknown as { default?: unknown }).default ??
  QRCodeImport) as ComponentType<QRCodeComponentProps>;

export function ShareFileModal() {
  const { currentFile, sharing } = useAppStore();
  const file = sharing ? currentFile : null;
  const [expiresInSeconds, setExpiresInSeconds] =
    useState<ShareDurationOption>(DEFAULT_SHARE_DURATION);
  const [sharePassword, setSharePassword] = useState("");
  const [shareLink, setShareLink] = useState<ShareLinkResponse | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { createShareLink, isMutating } = useCreateShareLinkMutation();

  const clearCopyFeedbackTimeout = () => {
    if (copyFeedbackTimeoutRef.current === null) {
      return;
    }

    clearTimeout(copyFeedbackTimeoutRef.current);
    copyFeedbackTimeoutRef.current = null;
  };

  const resetCopyFeedback = () => {
    clearCopyFeedbackTimeout();
    setIsLinkCopied(false);
  };

  const clearGeneratedLink = () => {
    requestIdRef.current += 1;
    resetCopyFeedback();
    setShareLink(null);
    setLoadError(null);
  };

  if (!file) {
    return null;
  }

  const passwordError = getSharePasswordError(sharePassword);
  const normalizedPassword = normalizeSharePassword(sharePassword);
  const shareDurationLabel = formatShareDuration(expiresInSeconds);
  const isLoading = isMutating;
  const shareText = shareLink
    ? [
        `文件名：${shareLink.fileName}`,
        `过期时间：${formatShareExpiry(shareLink.expiresAt)}`,
        `有效时长：${shareDurationLabel}`,
        shareLink.passwordProtected ? "该链接需要分享密码，请通过其他渠道发送密码。" : null,
        `下载链接：${shareLink.shareUrl}`,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n")
    : "";

  const handleClose = () => {
    resetCopyFeedback();
    closeFileShare();
  };

  const handleGenerateShareLink = async () => {
    if (passwordError) {
      return;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    resetCopyFeedback();
    setLoadError(null);
    setShareLink(null);

    try {
      const response = await createShareLink(
        file.path,
        expiresInSeconds,
        normalizedPassword || undefined,
      );
      if (requestIdRef.current !== currentRequestId) {
        return;
      }
      setShareLink(response);
    } catch (error) {
      if (requestIdRef.current !== currentRequestId) {
        return;
      }
      setLoadError(error instanceof Error ? error.message : "Failed to generate share link");
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink.shareUrl);
      clearCopyFeedbackTimeout();
      setIsLinkCopied(true);
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        copyFeedbackTimeoutRef.current = null;
        setIsLinkCopied(false);
      }, 1600);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy share link");
    }
  };

  const handleShare = async () => {
    if (!shareLink) {
      await handleGenerateShareLink();
      return;
    }

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: shareLink.fileName,
          text: shareText,
          url: shareLink.shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareText);
      toast.success("浏览器不支持系统分享，已复制分享内容");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (typeof navigator.share !== "function") {
        toast.error(error instanceof Error ? error.message : "Failed to copy share link");
        return;
      }

      toast.error(error instanceof Error ? error.message : "Failed to share file");
    }
  };

  return (
    <Dialog
      isOpen
      title={<h3 className="text-lg font-semibold text-base-content">文件分享</h3>}
      onClose={handleClose}
      onConfirm={handleShare}
      confirmText={shareLink ? "分享" : "生成链接"}
      confirmLoadingText="生成中"
      confirmDisabled={isLoading || Boolean(passwordError)}
      confirmLoading={isLoading}
      boxClassName="max-w-xl bg-base-100 px-4 py-3.5 shadow-xl sm:px-5"
      bodyClassName="pt-1"
      closeButtonAriaLabel="关闭分享弹窗"
      closeButtonClassName="btn-xs"
    >
      <>
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[1.15fr_0.85fr] sm:items-start">
          <div className="order-last sm:order-first">
            <div className="flex w-full flex-col items-center gap-1">
              <div className="flex w-full justify-center bg-white p-2">
                {shareLink ? (
                  <QRCode
                    value={shareLink.shareUrl}
                    size={216}
                    className="h-54 w-54"
                    bgColor="#ffffff"
                    fgColor="#111827"
                    style={{ shapeRendering: "crispEdges" }}
                  />
                ) : (
                  <div className="flex h-54 w-54 flex-col items-center justify-center gap-2 text-center text-base-content/55">
                    <div className="text-sm font-medium">生成后显示二维码</div>
                    <div className="max-w-44 text-xs leading-5">
                      可设置分享密码，生成后再复制或分享链接
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3.5">
            <div className="space-y-1">
              <div className="text-sm text-base-content/50">文件名</div>
              <div className="overflow-hidden font-mono text-sm font-medium leading-5 tracking-tight text-base-content [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {file.name}
              </div>
            </div>

            <label className="form-control flex items-center justify-between gap-1.5">
              <span className="text-sm text-base-content/50">有效时长</span>
              <select
                className="select select-sm w-full max-w-35"
                value={String(expiresInSeconds)}
                onChange={(event) => {
                  setExpiresInSeconds(Number(event.target.value) as ShareDurationOption);
                  clearGeneratedLink();
                }}
              >
                {shareDurationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control gap-1.5">
              <span className="text-sm text-base-content/50">分享密码</span>
              <input
                type="password"
                className={`input input-sm w-full ${passwordError ? "input-error" : ""}`.trim()}
                value={sharePassword}
                autoComplete="new-password"
                placeholder="可选，至少 6 位"
                onChange={(event) => {
                  setSharePassword(event.target.value);
                  clearGeneratedLink();
                }}
              />
              <span className={`text-xs ${passwordError ? "text-error" : "text-base-content/55"}`}>
                {passwordError ?? "留空则无需密码；密码不会放进分享文本"}
              </span>
            </label>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="text-sm text-base-content/50">下载链接</div>
                {shareLink?.passwordProtected ? (
                  <span className="badge badge-outline badge-xs">需要密码</span>
                ) : null}
              </div>
              {loadError ? (
                <div className="text-base text-error">{loadError}</div>
              ) : shareLink ? (
                <div className="flex items-center gap-2">
                  <a
                    href={shareLink.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={shareLink.shareUrl}
                    className="link min-w-0 flex-1 truncate font-mono text-sm text-primary"
                  >
                    {shareLink.shareUrl}
                  </a>
                  <ShareLinkCopyButton
                    isCopied={isLinkCopied}
                    onClick={() => void handleCopyLink()}
                  />
                </div>
              ) : (
                <div className="text-sm text-base-content/50">点击“生成链接”后显示</div>
              )}
            </div>
          </div>
        </div>
      </>
    </Dialog>
  );
}
