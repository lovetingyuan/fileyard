import useSWR from "swr";
import type { FileEntry } from "../../../../../types";
import { STANDARD_TEXT_CLASS_NAME } from "../../../../components/previewModalLayout";
import { cn } from "../../../../utils/cn";
import { PreviewUnsupportedMessage } from "./PreviewUnsupportedMessage";
import { PREVIEW_SIZE_LIMITS } from "./previewLimits";

export function TextPreview({
  file,
  previewUrl,
  isFullscreen,
  isEditing,
  editContent,
  isBusy,
  onEditContentChange,
  onDataLoaded,
}: {
  editContent: string;
  file: FileEntry;
  isBusy: boolean;
  isEditing: boolean;
  isFullscreen: boolean;
  onDataLoaded?: (data: string) => void;
  onEditContentChange: (content: string) => void;
  previewUrl: string;
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
      <PreviewUnsupportedMessage
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
    return <PreviewUnsupportedMessage reason="加载文件内容失败，请稍后重试" />;
  }

  if (isEditing) {
    return (
      <textarea
        className={cn(
          "textarea textarea-bordered w-full resize-none bg-info/5 font-mono text-sm",
          isFullscreen ? "h-full" : "h-[60vh]",
        )}
        aria-label="编辑文件内容"
        value={editContent}
        onChange={(e) => onEditContentChange(e.target.value)}
        disabled={isBusy}
      />
    );
  }

  return (
    <pre
      className={cn(
        isFullscreen
          ? "h-full overflow-auto whitespace-pre rounded-box bg-base-200 p-4 text-sm"
          : STANDARD_TEXT_CLASS_NAME,
      )}
    >
      {data}
    </pre>
  );
}
