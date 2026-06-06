import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { useParams } from "react-router-dom";
import type { ResolvedSharedFileMetadataResponse, SharedFileMetadataResponse } from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";
import { getSharePasswordError, normalizeSharePassword } from "../utils/sharePassword";
import { formatShareDuration } from "../utils/shareDurations";

type SharePageStatus = "active" | "expired" | "missing" | "locked" | "invalid" | "error";

type UnlockResult = {
  token: string;
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

export function ShareDownload() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockResult, setUnlockResult] = useState<UnlockResult | null>(null);
  const { data, error, isLoading } = useSWR<SharedFileMetadataResponse, ApiError>(
    token ? `/api/share-links/${encodeURIComponent(token)}` : null,
    (url: string) => apiRequest<SharedFileMetadataResponse>(url, { credentials: "same-origin" }),
  );

  const unlockedData = unlockResult && unlockResult.token === token ? unlockResult.data : null;
  const pageData = unlockedData ?? data;
  const status = getSharePageStatus(pageData, error);
  const resolvedData = getResolvedData(pageData);
  const fileName = resolvedData?.fileName ?? "未知文件";
  const normalizedPassword = normalizeSharePassword(password);
  const passwordError = getSharePasswordError(password);
  const visibleUnlockError = unlockError ?? passwordError;

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || unlockLoading) {
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
        `/api/share-links/${encodeURIComponent(token)}/unlock`,
        {
          method: "POST",
          credentials: "same-origin",
          body: JSON.stringify({ password: normalizedPassword }),
        },
      );
      setUnlockResult({ token, data: response });
      setPassword("");
    } catch (unlockRequestError) {
      setPassword("");
      setUnlockError(getUnlockErrorMessage(unlockRequestError));
    } finally {
      setUnlockLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-[94%] max-w-2xl flex-1 items-center py-10 sm:py-16">
      <section className="w-full rounded-[1.75rem] border border-base-300 bg-base-100 px-6 py-8 shadow-lg sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6">
          <h1 className="text-lg font-semibold text-base-content sm:text-xl">
            {status === "active"
              ? "文件下载"
              : status === "locked"
                ? "输入分享密码"
                : "文件无法下载"}
          </h1>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : status === "locked" ? (
            <form className="space-y-4" onSubmit={(event) => void handleUnlock(event)}>
              <label className="form-control gap-1.5">
                <span className="text-sm text-base-content/70">输入分享密码</span>
                <input
                  type="password"
                  className={`input input-bordered w-full ${visibleUnlockError ? "input-error" : ""}`.trim()}
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setUnlockError(null);
                  }}
                />
              </label>
              {visibleUnlockError ? (
                <p className="text-sm text-error">{visibleUnlockError}</p>
              ) : null}
              <button
                type="submit"
                className={`btn btn-primary w-full sm:w-auto ${unlockLoading ? "loading" : ""}`.trim()}
                disabled={unlockLoading || Boolean(passwordError) || !normalizedPassword}
              >
                解锁文件
              </button>
            </form>
          ) : status === "active" && resolvedData?.downloadUrl ? (
            <>
              <div className="space-y-2 text-base-content">
                <p className="text-sm text-base-content/70">文件名</p>
                <p className="break-all text-lg">{fileName}</p>
                <p className="text-right text-sm italic text-base-content/70">
                  {formatShareDuration(resolvedData.expiresInSeconds)} 后过期
                </p>
              </div>

              <a
                href={resolvedData.downloadUrl}
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
