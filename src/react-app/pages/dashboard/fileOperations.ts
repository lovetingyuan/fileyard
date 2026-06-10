import toast from "react-hot-toast";
import { buildDownloadUrl } from "../../hooks/useFilesApi";
import { getDownloadFilename } from "../../utils/fileFormatters";
import { setDownloadingPath } from "./actions";

const LARGE_FILE_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;

export async function runWithLargeFileUploadToast<T>(file: File, action: () => Promise<T>) {
  const waitingToastId =
    file.size >= LARGE_FILE_UPLOAD_THRESHOLD_BYTES
      ? toast.loading("Large file, please wait")
      : undefined;

  try {
    return await action();
  } finally {
    if (waitingToastId) {
      toast.dismiss(waitingToastId);
    }
  }
}

export async function downloadDashboardFile(path: string, fallbackName: string) {
  try {
    setDownloadingPath(path);
    const response = await fetch(buildDownloadUrl(path), { credentials: "include" });
    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = getDownloadFilename(
      response.headers.get("Content-Disposition"),
      fallbackName,
    );
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to download file");
  } finally {
    setDownloadingPath(null);
  }
}
