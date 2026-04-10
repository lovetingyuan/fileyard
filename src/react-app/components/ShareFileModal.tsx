import { useRef, useState, type ComponentType, type CSSProperties } from "react";
import QRCodeImport from "react-qr-code";
import toast from "react-hot-toast";
import type { FileEntry, ShareLinkResponse, ShareDurationOption } from "../../types";
import { Dialog } from "./Dialog";
import { useCreateShareLinkMutation } from "../hooks/useFilesApi";
import {
  formatShareDuration,
  formatShareExpiry,
  shareDurationOptions,
} from "../utils/shareDurations";

interface ShareFileModalProps {
  file: FileEntry | null;
  onClose: () => void;
}

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

async function copyToClipboard(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

function buildShareMessage(shareLink: ShareLinkResponse, shareDurationLabel: string): string {
  return [
    `文件名：${shareLink.fileName}`,
    `过期时间：${formatShareExpiry(shareLink.expiresAt)}`,
    `有效时长：${shareDurationLabel}`,
    `下载链接：${shareLink.shareUrl}`,
  ].join("\n");
}

export function ShareFileModal({ file, onClose }: ShareFileModalProps) {
  const [expiresInSeconds, setExpiresInSeconds] =
    useState<ShareDurationOption>(DEFAULT_SHARE_DURATION);
  const [shareLink, setShareLink] = useState<ShareLinkResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const initialFetchDoneRef = useRef(false);
  const { createShareLink, isMutating } = useCreateShareLinkMutation();

  const fetchShareLink = (filePath: string, duration: ShareDurationOption) => {
    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;
    setLoadError(null);
    setShareLink(null);

    void createShareLink(filePath, duration)
      .then((response) => {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }
        setShareLink(response);
      })
      .catch((error) => {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Failed to generate share link");
      });
  };

  // Trigger initial fetch on first render with file
  if (file && !initialFetchDoneRef.current) {
    initialFetchDoneRef.current = true;
    fetchShareLink(file.path, expiresInSeconds);
  }

  if (!file) {
    return null;
  }

  const isLoading = isMutating || shareLink === null;
  const shareDurationLabel = formatShareDuration(expiresInSeconds);
  const shareText = shareLink ? buildShareMessage(shareLink, shareDurationLabel) : "";

  const handleCopyLink = async () => {
    if (!shareLink) {
      return;
    }

    try {
      await copyToClipboard(shareLink.shareUrl);
      toast.success("下载链接已复制");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy share link");
    }
  };

  const handleShare = async () => {
    if (!shareLink) {
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

      await copyToClipboard(shareText);
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
      onClose={onClose}
      onConfirm={handleShare}
      confirmText="分享"
      confirmLoadingText="生成中"
      confirmDisabled={isLoading || Boolean(loadError) || !shareLink}
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
              <div className="text-sm text-base-content/50">扫码下载</div>
              <div className="flex w-full justify-center   bg-white p-2 ">
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
                  <div className="flex h-54 w-54 items-center justify-center text-base-content/45">
                    <span className="loading loading-spinner loading-md" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3.5">
            <div className="space-y-1">
              <div className="text-sm text-base-content/50">文件名</div>
              <div className="truncate font-mono font-medium tracking-tight text-base-content">
                {file.name}
              </div>
            </div>

            <label className="form-control gap-1.5 flex justify-between items-center">
              <span className="text-sm text-base-content/50">有效时长</span>
              <select
                className="select select-sm w-full max-w-35"
                value={String(expiresInSeconds)}
                onChange={(event) => {
                  const newDuration = Number(event.target.value) as ShareDurationOption;
                  setExpiresInSeconds(newDuration);
                  if (file) {
                    fetchShareLink(file.path, newDuration);
                  }
                }}
              >
                {shareDurationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-1.5">
              <div className="text-sm text-base-content/50">下载链接</div>
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
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm shrink-0"
                    onClick={handleCopyLink}
                  >
                    复制
                  </button>
                </div>
              ) : (
                <div className="text-base text-base-content/50">正在生成链接...</div>
              )}
            </div>
          </div>
        </div>
      </>
    </Dialog>
  );
}
