import { useEffect } from "react";
import useSWR from "swr";
import type { FileEntry } from "../../../../../types";
import { STANDARD_PDF_CLASS_NAME } from "../../../../components/previewModalLayout";
import { cn } from "../../../../utils/cn";
import { PreviewUnsupportedMessage } from "./PreviewUnsupportedMessage";
import { PREVIEW_SIZE_LIMITS } from "./previewLimits";

export function PdfPreview({
  file,
  previewUrl,
  isFullscreen,
}: {
  file: FileEntry;
  isFullscreen: boolean;
  previewUrl: string;
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
        throw Object.assign(new Error("加载失败"), { status: response.status });
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
      <PreviewUnsupportedMessage
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
    return <PreviewUnsupportedMessage reason="加载 PDF 失败，请稍后重试" />;
  }

  return (
    <iframe
      src={blobUrl}
      title="PDF Preview"
      className={cn(isFullscreen ? "w-full rounded border-0 h-full" : STANDARD_PDF_CLASS_NAME)}
    />
  );
}
