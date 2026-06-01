import { useState } from "react";
import MdiClipboardFileOutline from "~icons/mdi/clipboard-file-outline";
import MdiContentPaste from "~icons/mdi/content-paste";
import type { ClipboardUploadItem } from "../../../../types";
import { Dialog } from "../../../components/Dialog";
import { getFileIcon } from "../../../constants/fileIcons";
import {
  createClipboardUploadItemsFromFiles,
  extractClipboardFilesFromData,
  readClipboardUploadItems,
} from "../../../utils/clipboardUpload";
import { formatBytes } from "../../../utils/fileFormatters";
import { uploadDashboardFiles } from "../uploadFiles";

type ClipboardUploadButtonProps = {
  isFileMutationDisabled: boolean;
};

const AUTO_READ_UNAVAILABLE_MESSAGE = "无法自动读取剪贴板，请在弹窗中粘贴文件";
const EMPTY_CLIPBOARD_MESSAGE = "剪贴板中没有可上传的文件";
const AUTO_READ_TIMEOUT_MS = 2000;

function getNavigatorClipboardItems(): Promise<ClipboardItem[]> | null {
  if (typeof navigator === "undefined" || !navigator.clipboard?.read) {
    return null;
  }

  return navigator.clipboard.read();
}

function withClipboardReadTimeout(
  pendingItems: Promise<ClipboardItem[]>,
): Promise<ClipboardItem[] | null> {
  return Promise.race([
    pendingItems,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), AUTO_READ_TIMEOUT_MS);
    }),
  ]);
}

function ClipboardUploadFileRow({ item }: { item: ClipboardUploadItem }) {
  const { Icon, color } = getFileIcon(item.name);

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-base-200">
        <Icon className={`h-6 w-6 ${color}`} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={item.name}>
          {item.name}
        </p>
        <p className="text-xs text-base-content/60">{formatBytes(item.size)}</p>
      </div>
    </li>
  );
}

export function ClipboardUploadButton({ isFileMutationDisabled }: ClipboardUploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);
  const [clipboardItems, setClipboardItems] = useState<ClipboardUploadItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const readClipboard = async () => {
    const pendingClipboardItems = getNavigatorClipboardItems();
    if (!pendingClipboardItems) {
      setStatusMessage(AUTO_READ_UNAVAILABLE_MESSAGE);
      return;
    }

    setIsReadingClipboard(true);
    setStatusMessage(null);
    try {
      const clipboardItems = await withClipboardReadTimeout(pendingClipboardItems);
      if (!clipboardItems) {
        setStatusMessage(AUTO_READ_UNAVAILABLE_MESSAGE);
        return;
      }
      const items = await readClipboardUploadItems(clipboardItems);
      setClipboardItems(items);
      setStatusMessage(items.length > 0 ? null : EMPTY_CLIPBOARD_MESSAGE);
    } catch {
      setStatusMessage(AUTO_READ_UNAVAILABLE_MESSAGE);
    } finally {
      setIsReadingClipboard(false);
    }
  };

  const openModal = () => {
    setClipboardItems([]);
    setStatusMessage(null);
    setIsOpen(true);
    void readClipboard();
  };

  const closeModal = () => {
    setIsOpen(false);
    setClipboardItems([]);
    setStatusMessage(null);
    setIsReadingClipboard(false);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const files = extractClipboardFilesFromData(event.clipboardData);
    if (files.length === 0) {
      setStatusMessage("粘贴内容中没有可上传的文件");
      return;
    }

    event.preventDefault();
    const items = createClipboardUploadItemsFromFiles(files);
    setClipboardItems(items);
    setStatusMessage(null);
  };

  const uploadClipboardFiles = async () => {
    if (clipboardItems.length === 0) {
      return;
    }

    await uploadDashboardFiles({
      files: clipboardItems.map((item) => item.file),
      source: "clipboard",
      isFileMutationDisabled,
    });
    closeModal();
  };

  return (
    <>
      <div className="tooltip" data-tip="上传剪贴板文件">
        <button
          type="button"
          className="btn btn-square btn-sm border-sky-500 bg-sky-500 text-white hover:border-sky-600 hover:bg-sky-600 focus-visible:outline-sky-500 disabled:border-sky-300 disabled:bg-sky-300"
          onClick={openModal}
          disabled={isFileMutationDisabled}
          aria-label="上传剪贴板文件"
        >
          <MdiClipboardFileOutline className="h-5 w-5" />
        </button>
      </div>

      <Dialog
        isOpen={isOpen}
        title="上传剪贴板文件"
        onClose={closeModal}
        onConfirm={uploadClipboardFiles}
        confirmText="上传"
        confirmPendingText="上传中"
        confirmDisabled={clipboardItems.length === 0 || isReadingClipboard}
        widthMode="content"
        boxClassName="w-[min(34rem,95vw)]"
      >
        <div className="flex flex-col gap-4" onPaste={handlePaste}>
          <div
            className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-3 rounded-box border border-dashed border-base-300 bg-base-200/70 p-5 text-center outline-none focus:border-primary focus:bg-primary/10"
            tabIndex={0}
          >
            {isReadingClipboard ? (
              <span className="loading loading-spinner loading-md text-primary" />
            ) : (
              <MdiContentPaste className="h-8 w-8 text-base-content/50" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isReadingClipboard ? "正在读取剪贴板" : "可点击此处并粘贴"}
              </p>
              {statusMessage ? <p className="text-xs text-base-content/60">{statusMessage}</p> : null}
            </div>
          </div>

          {clipboardItems.length > 0 ? (
            <div className="max-h-[45vh] overflow-y-auto pr-2 [scrollbar-gutter:stable]">
              <ul className="divide-y divide-base-300">
                {clipboardItems.map((item) => (
                  <ClipboardUploadFileRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
