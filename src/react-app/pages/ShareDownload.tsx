import useSWR from "swr";
import { useParams } from "react-router-dom";
import type { SharedFileMetadataResponse } from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";
import { formatShareDuration } from "../utils/shareDurations";

function buildSharedFileMetadataUrl(token: string): string {
  return `/api/share-links/${encodeURIComponent(token)}`;
}

type SharePageStatus = "active" | "expired" | "missing" | "invalid" | "error";

function getSharePageStatus(
  data: SharedFileMetadataResponse | undefined,
  error: ApiError | undefined,
): SharePageStatus {
  if (error?.status === 403) {
    return "invalid";
  }

  if (error) {
    return "error";
  }

  return data?.status ?? "active";
}

function getUnavailableReason(status: SharePageStatus, error?: ApiError): string {
  if (status === "expired") {
    return "链接已过期";
  }

  if (status === "missing") {
    return "文件不存在或已不可用";
  }

  if (status === "invalid") {
    return "分享链接无效";
  }

  if (status === "active") {
    return "文件暂时不可下载";
  }

  return error?.message ?? "暂时无法读取文件信息";
}

export function ShareDownload() {
  const { token } = useParams<{ token: string }>();
  const { data, error, isLoading } = useSWR<SharedFileMetadataResponse, ApiError>(
    token ? buildSharedFileMetadataUrl(token) : null,
    (url: string) => apiRequest<SharedFileMetadataResponse>(url, { credentials: "same-origin" }),
  );

  const status = getSharePageStatus(data, error);
  const fileName = data?.fileName ?? "未知文件";

  return (
    <main className="mx-auto flex w-[94%] max-w-2xl flex-1 items-center py-10 sm:py-16">
      <section className="w-full rounded-[1.75rem] border border-base-300 bg-base-100 px-6 py-8 shadow-lg sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6">
          <h1 className="text-lg font-semibold text-base-content sm:text-xl">
            {status === "active" ? "文件下载" : "文件无法下载"}
          </h1>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : status === "active" && data?.downloadUrl ? (
            <>
              <div className="space-y-2 text-base-content">
                <p className="text-sm text-base-content/70">文件名</p>
                <p className="break-all text-lg">{fileName}</p>
                <p className="text-sm text-right italic text-base-content/70">
                  {formatShareDuration(data.expiresInSeconds)} 后过期
                </p>
              </div>

              <a
                href={data.downloadUrl}
                download={fileName}
                className="btn btn-primary w-full sm:w-auto"
              >
                下载文件
              </a>
            </>
          ) : (
            <div className="space-y-2 text-base-content">
              <p className="text-sm text-base-content/70">文件名</p>
              <p className="break-all text-lg">{fileName}</p>
              <p className="text-sm text-base-content/70">{getUnavailableReason(status, error)}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
