import { Icon } from "@iconify/react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import type { FileEntry } from "../../types";
import { Dialog } from "./Dialog";
import { buildPreviewUrl } from "../hooks/useFilesApi";
import { type PreviewInfo, getPreviewInfo } from "../utils/previewInfo";

// --- Preview size limits (in bytes) ---

const PREVIEW_SIZE_LIMITS = {
  TEXT: 2 * 1024 * 1024, // 2MB
  IMAGE: 15 * 1024 * 1024, // 15MB
  PDF: 30 * 1024 * 1024, // 30MB
  VIDEO: 200 * 1024 * 1024, // 200MB
  AUDIO: 100 * 1024 * 1024, // 100MB
} as const;

// --- Sub-components ---

function TextPreview({
  file,
  previewUrl,
  isFullscreen,
  isEditing,
  editContent,
  isBusy,
  onEditContentChange,
  onDataLoaded,
}: {
  file: FileEntry;
  previewUrl: string;
  isFullscreen: boolean;
  isEditing: boolean;
  editContent: string;
  isBusy: boolean;
  onEditContentChange: (content: string) => void;
  onDataLoaded?: (data: string) => void;
}) {
  const tooLarge = file.size > PREVIEW_SIZE_LIMITS.TEXT;
  const { data, isLoading, error } = useSWR(
    tooLarge ? null : previewUrl,
    (url: string) =>
      fetch(url, { credentials: "include" }).then((r) => {
        if (!r.ok) {
          throw new Error("加载失败");
        }
        return r.text();
      }),
    { onSuccess: (d) => onDataLoaded?.(d) },
  );

  if (tooLarge) {
    return (
      <UnsupportedMessage
        reason={`文件过大，无法预览（超过 ${PREVIEW_SIZE_LIMITS.TEXT / 1024 / 1024}MB）`}
      />
    );
  }
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }
  if (error) {
    return <UnsupportedMessage reason="加载文件内容失败，请稍后重试" />;
  }

  if (isEditing) {
    return (
      <textarea
        className={`textarea textarea-bordered w-full font-mono text-sm resize-none ${isFullscreen ? "h-full" : "h-[60vh]"}`}
        value={editContent}
        onChange={(e) => onEditContentChange(e.target.value)}
        disabled={isBusy}
      />
    );
  }

  return (
    <pre
      className={`overflow-auto text-sm bg-base-200 rounded-box p-4 whitespace-pre ${isFullscreen ? "h-full" : "max-h-[60vh]"}`}
    >
      {data}
    </pre>
  );
}

function UnsupportedMessage({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-base-content/60">
      <Icon icon="mdi:file-alert-outline" className="w-12 h-12" />
      <p className="text-sm text-center">{reason}</p>
    </div>
  );
}

function PdfPreview({
  file,
  previewUrl,
  isFullscreen,
}: {
  file: FileEntry;
  previewUrl: string;
  isFullscreen: boolean;
}) {
  const tooLarge = file.size > PREVIEW_SIZE_LIMITS.PDF;

  const {
    data: blobUrl,
    isLoading,
    error,
  } = useSWR(
    tooLarge ? null : previewUrl,
    async (url: string) => {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("加载失败");
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (tooLarge) {
    return (
      <UnsupportedMessage
        reason={`PDF 文件过大，无法预览（超过 ${PREVIEW_SIZE_LIMITS.PDF / 1024 / 1024}MB）`}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }
  if (error) {
    return <UnsupportedMessage reason="加载 PDF 失败，请稍后重试" />;
  }

  return (
    <iframe
      src={blobUrl}
      title="PDF Preview"
      className={`w-full rounded border-0 ${isFullscreen ? "h-full" : "h-[70vh]"}`}
    />
  );
}

// --- Fullscreen content wrapper ---

function FullscreenContent({
  file,
  previewUrl,
  info,
  sizeError,
  onExit,
}: {
  file: FileEntry;
  previewUrl: string;
  info: PreviewInfo;
  sizeError: string | null;
  onExit: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    el.requestFullscreen().catch(() => {});

    const handleChange = () => {
      if (!document.fullscreenElement) {
        onExit();
      }
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [onExit]);

  return (
    <div ref={containerRef} className="w-full h-full bg-base-100 flex flex-col">
      {sizeError ? (
        <UnsupportedMessage reason={sizeError} />
      ) : (
        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-2">
          {info.kind === "image" && (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-h-full max-w-full object-contain"
            />
          )}
          {info.kind === "video" && (
            <video src={previewUrl} controls className="max-h-full max-w-full" />
          )}
          {info.kind === "audio" && <audio src={previewUrl} controls className="w-full max-w-lg" />}
          {info.kind === "pdf" && <PdfPreview file={file} previewUrl={previewUrl} isFullscreen />}
          {info.kind === "text" && (
            <TextPreview
              file={file}
              previewUrl={previewUrl}
              isFullscreen
              isEditing={false}
              editContent=""
              isBusy={false}
              onEditContentChange={() => {}}
            />
          )}
          {info.kind === "unsupported" && (
            <UnsupportedMessage reason={info.reason ?? "该文件类型暂不支持预览"} />
          )}
        </div>
      )}
    </div>
  );
}

// --- Main modal ---

interface PreviewModalProps {
  file: FileEntry | null;
  onClose: () => void;
  onSave?: (path: string, content: string) => Promise<void>;
}

export function PreviewModal({ file, onClose, onSave }: PreviewModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [forceTextPreview, setForceTextPreview] = useState(false);
  const loadedTextRef = useRef("");

  const handleClose = () => {
    setIsFullscreen(false);
    setIsEditing(false);
    setEditContent("");
    setForceTextPreview(false);
    loadedTextRef.current = "";
    onClose();
  };

  const previewUrl = file ? buildPreviewUrl(file.path) : "";
  const info = file ? getPreviewInfo(file) : { kind: "unsupported" as const };
  const effectiveInfo = forceTextPreview ? { kind: "text" as const } : info;

  if (!file) {
    return null;
  }

  const canForceTextPreview =
    info.kind === "unsupported" && file.size <= PREVIEW_SIZE_LIMITS.TEXT;
  const canEditTextFile = info.kind === "text" && Boolean(onSave);

  const handleDataLoaded = (data: string) => {
    loadedTextRef.current = data;
  };

  const handleStartEdit = () => {
    setEditContent(loadedTextRef.current);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleSave = async () => {
    if (!onSave || !file) {
      return;
    }
    await onSave(file.path, editContent);
    handleClose();
  };

  let sizeError: string | null = null;
  if (effectiveInfo.kind === "image" && file.size > PREVIEW_SIZE_LIMITS.IMAGE) {
    sizeError = `图片文件过大，无法预览（超过 ${PREVIEW_SIZE_LIMITS.IMAGE / 1024 / 1024}MB）`;
  } else if (effectiveInfo.kind === "video" && file.size > PREVIEW_SIZE_LIMITS.VIDEO) {
    sizeError = `视频文件过大，无法预览（超过 ${PREVIEW_SIZE_LIMITS.VIDEO / 1024 / 1024}MB）`;
  } else if (effectiveInfo.kind === "audio" && file.size > PREVIEW_SIZE_LIMITS.AUDIO) {
    sizeError = `音频文件过大，无法预览（超过 ${PREVIEW_SIZE_LIMITS.AUDIO / 1024 / 1024}MB）`;
  }

  return (
    <>
      <Dialog
        isOpen
        title={<h3 className="truncate pr-4 font-bold text-base">{file.name}</h3>}
        onClose={handleClose}
        boxClassName="flex max-h-[95vh] w-[95vw] max-w-[95vw] flex-col"
        bodyClassName="flex-1 min-h-0 overflow-auto p-1"
        closeButtonAriaLabel="关闭文件预览弹窗"
        headerClassName="items-center"
        headerActions={
          !isEditing && effectiveInfo.kind !== "unsupported" ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              onClick={() => setIsFullscreen(true)}
              title="全屏预览"
            >
              <Icon icon="mdi:fullscreen" className="w-5 h-5" />
            </button>
          ) : undefined
        }
        footer={
          canEditTextFile && !sizeError
            ? ({ confirm, isConfirming }) =>
                isEditing ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={handleCancelEdit}
                      disabled={isConfirming}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm btn-primary ${isConfirming ? "loading" : ""}`}
                      onClick={() => void confirm()}
                      disabled={isConfirming}
                    >
                      {isConfirming ? "保存中..." : "保存"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleStartEdit}
                  >
                    <Icon icon="mdi:pencil" className="w-4 h-4" />
                    编辑
                  </button>
                )
            : undefined
        }
        showCancelButton={false}
        showConfirmButton={false}
        onConfirm={isEditing ? handleSave : undefined}
      >
        {({ isConfirming }) => (
          <>
            {sizeError ? (
              <UnsupportedMessage reason={sizeError} />
            ) : (
              <>
                {effectiveInfo.kind === "image" && (
                  <div className="flex justify-center">
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="max-h-[70vh] max-w-full object-contain rounded"
                    />
                  </div>
                )}
                {effectiveInfo.kind === "video" && (
                  <video src={previewUrl} controls className="w-full max-h-[65vh] rounded" />
                )}
                {effectiveInfo.kind === "audio" && (
                  <div className="flex justify-center py-8">
                    <audio src={previewUrl} controls className="w-full max-w-lg" />
                  </div>
                )}
                {effectiveInfo.kind === "pdf" && (
                  <PdfPreview file={file} previewUrl={previewUrl} isFullscreen={false} />
                )}
                {effectiveInfo.kind === "text" && (
                  <TextPreview
                    file={file}
                    previewUrl={previewUrl}
                    isFullscreen={false}
                    isEditing={isEditing && info.kind === "text"}
                    editContent={editContent}
                    isBusy={isConfirming}
                    onEditContentChange={setEditContent}
                    onDataLoaded={handleDataLoaded}
                  />
                )}
                {effectiveInfo.kind === "unsupported" && (
                  <div className="flex flex-col items-center gap-4 py-12 text-center">
                    <p className="text-sm text-base-content/70">
                      此文件类型不支持预览，您可以下载后查看
                    </p>
                    {canForceTextPreview ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setForceTextPreview(true)}
                      >
                        按文本打开
                      </button>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Dialog>
      {isFullscreen && (
        <FullscreenContent
          file={file}
          previewUrl={previewUrl}
          info={effectiveInfo}
          sizeError={sizeError}
          onExit={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
}
