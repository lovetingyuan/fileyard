import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { useParams } from "react-router-dom";
import type { ResolvedSharedFileMetadataResponse, SharedFileMetadataResponse } from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";
import { cn } from "../utils/cn";
import { formatBytes } from "../utils/fileFormatters";
import { getSharePasswordError, normalizeSharePassword } from "../utils/sharePassword";
import { formatShareDuration } from "../utils/shareDurations";

type SharePageStatus = "active" | "expired" | "missing" | "locked" | "invalid" | "error";

type UnlockResult = {
  shareId: string;
  data: SharedFileMetadataResponse;
};

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

function getUnlockErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "密码不正确";
    }

    if (error.status === 429) {
      return "尝试次数过多，请稍后再试";
    }

    return error.message;
  }

  return error instanceof Error ? error.message : "无法验证分享密码";
}

function getResolvedData(
  data: SharedFileMetadataResponse | undefined,
): ResolvedSharedFileMetadataResponse | undefined {
  return data && data.status !== "locked" ? data : undefined;
}

function triggerDownload(downloadUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
}

export function ShareDownload() {
  const { id: shareId } = useParams<{ id: string }>();
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockResult, setUnlockResult] = useState<UnlockResult | null>(null);
  const { data, error, isLoading } = useSWR<SharedFileMetadataResponse, ApiError>(
    shareId ? `/api/share-links/${encodeURIComponent(shareId)}` : null,
    (url: string) => apiRequest<SharedFileMetadataResponse>(url, { credentials: "same-origin" }),
  );

  const unlockedData = unlockResult && unlockResult.shareId === shareId ? unlockResult.data : null;
  const pageData = unlockedData ?? data;
  const status = getSharePageStatus(pageData, error);
  const resolvedData = getResolvedData(pageData);
  const fileName = resolvedData?.fileName ?? "未知文件";
  const isMultiFileShare = Boolean(resolvedData && resolvedData.fileCount > 1);
  const downloadableFileCount =
    resolvedData?.files.filter((file) => file.status === "active" && file.downloadUrl).length ?? 0;
  const normalizedPassword = normalizeSharePassword(password);
  const passwordError = getSharePasswordError(password);
  const visibleUnlockError = unlockError ?? passwordError;

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shareId || unlockLoading) {
      return;
    }

    if (!normalizedPassword) {
      setUnlockError("请输入分享密码");
      return;
    }

    if (passwordError) {
      setUnlockError(passwordError);
      return;
    }

    setUnlockLoading(true);
    setUnlockError(null);
    try {
      const response = await apiRequest<SharedFileMetadataResponse>(
        `/api/share-links/${encodeURIComponent(shareId)}/unlocks`,
        {
          method: "POST",
          credentials: "same-origin",
          body: JSON.stringify({ password: normalizedPassword }),
        },
      );
      setUnlockResult({ shareId, data: response });
      setPassword("");
    } catch (unlockRequestError) {
      setPassword("");
      setUnlockError(getUnlockErrorMessage(unlockRequestError));
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleDownloadAll = () => {
    if (!resolvedData) {
      return;
    }

    for (const file of resolvedData.files) {
      if (file.status !== "active" || !file.downloadUrl) {
        continue;
      }

      triggerDownload(file.downloadUrl, file.fileName);
    }
  };

  return (
    <main className="mx-auto flex min-h-0 w-[94%] max-w-2xl flex-1 items-start overflow-hidden py-5 sm:py-8">
      <section className="flex max-h-full min-h-0 w-full flex-col rounded-[1.75rem] border border-base-300 bg-base-100 px-6 py-8 shadow-lg sm:px-8 sm:py-10">
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <h1 className="text-lg font-semibold text-base-content sm:text-xl">
              {status === "active"
                ? "文件下载"
                : status === "locked"
                  ? "输入分享密码"
                  : "文件无法下载"}
            </h1>
            {status === "active" && isMultiFileShare && resolvedData ? (
              <div className="shrink-0 text-right text-sm text-base-content/65">
                <p>
                  共 {resolvedData.fileCount} 个文件&nbsp;
                  <i>({formatShareDuration(resolvedData.expiresInSeconds)}后过期)</i>
                </p>
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : status === "locked" ? (
            <form className="space-y-4" onSubmit={(event) => void handleUnlock(event)}>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-base-content/70">输入分享密码</span>
                <div className="flex gap-3">
                  <input
                    type="password"
                    className={cn("input min-w-0 flex-1", visibleUnlockError && "input-error")}
                    value={password}
                    autoComplete="current-password"
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setUnlockError(null);
                    }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary shrink-0"
                    disabled={unlockLoading || Boolean(passwordError) || !normalizedPassword}
                  >
                    {unlockLoading ? (
                      <span className="loading loading-spinner" aria-hidden="true" />
                    ) : null}
                    解锁文件
                  </button>
                </div>
              </label>
              {visibleUnlockError ? (
                <p className="text-sm text-error">{visibleUnlockError}</p>
              ) : null}
            </form>
          ) : status === "active" && resolvedData ? (
            <>
              {isMultiFileShare ? (
                <div className="flex min-h-0 flex-1 flex-col gap-3 text-base-content">
                  <div className="min-h-0 flex-1 divide-y divide-base-300 overflow-y-auto rounded-box border border-base-300 [scrollbar-gutter:stable]">
                    {resolvedData.files.map((file, index) => (
                      <div
                        key={`${index}:${file.fileName}`}
                        className="flex min-w-0 items-center gap-3 px-3 py-2"
                      >
                        <p
                          className="min-w-0 flex-1 truncate text-sm font-medium"
                          title={file.fileName}
                        >
                          {file.fileName}
                        </p>
                        <span className="shrink-0 text-xs text-base-content/60">
                          {formatBytes(file.size)}
                        </span>
                        {file.status === "active" && file.downloadUrl ? (
                          <a
                            href={file.downloadUrl}
                            download={file.fileName}
                            className="btn btn-primary btn-sm shrink-0"
                          >
                            下载
                          </a>
                        ) : (
                          <button type="button" className="btn btn-sm shrink-0" disabled>
                            不可用
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    disabled={downloadableFileCount === 0}
                    onClick={handleDownloadAll}
                  >
                    一键下载
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 text-base-content">
                    <p className="text-sm text-base-content/70">文件名</p>
                    <p className="break-all text-lg">{fileName}</p>
                    <p className="text-right text-sm italic text-base-content/70">
                      {formatShareDuration(resolvedData.expiresInSeconds)} 后过期
                    </p>
                  </div>

                  {resolvedData.downloadUrl ? (
                    <a
                      href={resolvedData.downloadUrl}
                      download={fileName}
                      className="btn btn-primary w-full sm:w-auto"
                    >
                      下载文件
                    </a>
                  ) : (
                    <button type="button" className="btn btn-primary w-full sm:w-auto" disabled>
                      文件不可用
                    </button>
                  )}
                </>
              )}
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
