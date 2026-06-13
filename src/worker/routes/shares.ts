import { Hono } from "hono";
import type { Context } from "hono";
import type {
  CreateShareLinkRequest,
  ResolvedSharedFileMetadataResponse,
  ShareFileSummary,
  ShareLinkResponse,
  SharedFileMetadataResponse,
  VerifySharePasswordRequest,
} from "../../types";
import { SHARE_PASSWORD_MAX_LENGTH, SHARE_PASSWORD_MIN_LENGTH } from "../../types";
import type { AppContext } from "../context";
import { getFileContext } from "../utils/appHelpers";
import {
  FilePathValidationError,
  getBaseName,
  getFileKey,
  isReservedSystemPath,
  normalizeRelativePath,
  toContentDisposition,
} from "../utils/fileManager";
import { handlePathValidationError, jsonError } from "../utils/response";
import {
  buildShareDownloadUrl,
  buildSharePageUrl,
  createShareDownloadTicket,
  createShareToken,
  getShareExpiryTimestamp,
  getShareTokenDigest,
  isShareDownloadTicketValid,
  isShareDurationOption,
  isShareExpired,
  resolveAppOrigin,
  verifySharePassword,
  verifyShareToken,
  type ShareFileTokenEntry,
  type ShareTokenPayload,
} from "../utils/shareLinks";
import {
  createShareLinkJsonValidator,
  getValidatedJson,
  getValidatedParam,
  shareTokenParamValidator,
  type ShareTokenParam,
  verifySharePasswordJsonValidator,
} from "../validation";
import { getCreateShareLinkPaths, parseShareDownloadFileIndex } from "./shareRouteHelpers";

const shares = new Hono<AppContext>();
const SHARE_UNLOCK_MAX_FAILURES = 10;
const SHARE_UNLOCK_FAILURE_TTL_SECONDS = 10 * 60;
type ShareRouteContext = Context<AppContext>;

function applyNoStoreHeaders(headers: Headers): void {
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
}

function jsonShareResponse(
  payload: ShareLinkResponse | SharedFileMetadataResponse,
  status = 200,
): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  applyNoStoreHeaders(headers);
  return new Response(JSON.stringify(payload), { status, headers });
}

function jsonShareError(message: string, status: number): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  applyNoStoreHeaders(headers);
  return new Response(JSON.stringify({ success: false, error: message }), { status, headers });
}

function assertPathNotReserved(path: string): void {
  if (isReservedSystemPath(path)) {
    throw new FilePathValidationError("Path uses a reserved system directory", 403);
  }
}

function normalizeOptionalSharePassword(password: string | undefined): string {
  return password?.trim() ?? "";
}

function getSharePasswordValidationError(password: string): string | null {
  if (password.length < SHARE_PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${SHARE_PASSWORD_MIN_LENGTH} characters long`;
  }

  if (password.length > SHARE_PASSWORD_MAX_LENGTH) {
    return `Password must be at most ${SHARE_PASSWORD_MAX_LENGTH} characters long`;
  }

  return null;
}

function getLockedShareResponse(): SharedFileMetadataResponse {
  return {
    success: true,
    status: "locked",
    fileName: null,
    expiresAt: null,
    expiresInSeconds: null,
    serverNow: new Date().toISOString(),
    downloadUrl: null,
    passwordProtected: true,
  };
}

function getShareFileSummaries(files: ShareFileTokenEntry[]): ShareFileSummary[] {
  return files.map((file) => ({
    fileName: file.fileName,
    size: file.size,
  }));
}

function getShareDisplayName(files: ShareFileTokenEntry[]): string {
  return files.length === 1 ? (files[0]?.fileName ?? "未知文件") : `${files.length} 个文件`;
}

function getExpiredShareFiles(
  payload: ShareTokenPayload,
): ResolvedSharedFileMetadataResponse["files"] {
  return payload.files.map((file) => ({
    fileName: file.fileName,
    size: file.size,
    status: "active",
    downloadUrl: null,
  }));
}

function getResolvedShareResponse(
  payload: ShareTokenPayload,
  status: Exclude<SharedFileMetadataResponse["status"], "locked">,
  files: ResolvedSharedFileMetadataResponse["files"],
): SharedFileMetadataResponse {
  return {
    success: true,
    status,
    fileName: payload.fileName,
    fileCount: payload.files.length,
    files,
    expiresAt: new Date(payload.exp).toISOString(),
    expiresInSeconds: payload.expiresInSeconds,
    serverNow: new Date().toISOString(),
    downloadUrl: status === "active" ? (files[0]?.downloadUrl ?? null) : null,
    passwordProtected: payload.passwordProtected,
  };
}

async function resolveShareFiles(
  c: ShareRouteContext,
  payload: ShareTokenPayload,
  token: string,
  ticket?: string,
): Promise<ResolvedSharedFileMetadataResponse["files"]> {
  const origin = resolveAppOrigin(c.req.url, c.env);
  const isMultiFileShare = payload.files.length > 1;

  return Promise.all(
    payload.files.map(async (file, index) => {
      const object = await c.env.FILES_BUCKET.head(getFileKey(payload.rootDirId, file.path));
      const isAvailable = Boolean(object && object.etag === file.etag);

      return {
        fileName: file.fileName,
        size: object?.size ?? file.size,
        status: isAvailable ? "active" : "missing",
        downloadUrl: isAvailable
          ? buildShareDownloadUrl(origin, token, ticket, isMultiFileShare ? index : undefined)
          : null,
      };
    }),
  );
}

async function resolveSharedFileMetadata(
  c: ShareRouteContext,
  payload: ShareTokenPayload,
  token: string,
  includeDownloadTicket: boolean,
): Promise<SharedFileMetadataResponse> {
  if (isShareExpired(payload)) {
    return getResolvedShareResponse(payload, "expired", getExpiredShareFiles(payload));
  }

  const ticket = includeDownloadTicket
    ? await createShareDownloadTicket(c.env, token, payload)
    : undefined;
  const files = await resolveShareFiles(c, payload, token, ticket);
  const status =
    payload.files.length === 1 && files[0]?.status === "missing" ? "missing" : "active";

  return getResolvedShareResponse(payload, status, files);
}

function getUnlockClientId(c: ShareRouteContext): string {
  const forwardedFor = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return c.req.header("cf-connecting-ip") ?? forwardedFor ?? "unknown";
}

async function getUnlockAttemptKey(c: ShareRouteContext, token: string): Promise<string> {
  return `share-unlock:${await getShareTokenDigest(`${token}:${getUnlockClientId(c)}`)}`;
}

async function getFailedUnlockCount(c: ShareRouteContext, token: string): Promise<number> {
  const raw = await c.env.FILE_YARD_KV.get(await getUnlockAttemptKey(c, token));
  const count = raw ? Number(raw) : 0;
  return Number.isInteger(count) && count > 0 ? count : 0;
}

async function recordFailedUnlock(c: ShareRouteContext, token: string): Promise<void> {
  const key = await getUnlockAttemptKey(c, token);
  const currentCount = await getFailedUnlockCount(c, token);
  await c.env.FILE_YARD_KV.put(String(key), String(currentCount + 1), {
    expirationTtl: SHARE_UNLOCK_FAILURE_TTL_SECONDS,
  });
}

async function clearFailedUnlocks(c: ShareRouteContext, token: string): Promise<void> {
  await c.env.FILE_YARD_KV.delete(await getUnlockAttemptKey(c, token));
}

shares.post("/api/files/share-links", createShareLinkJsonValidator, async (c) => {
  try {
    const body = getValidatedJson<CreateShareLinkRequest>(c);
    const paths = getCreateShareLinkPaths(body).map((path) =>
      normalizeRelativePath(path, { allowEmpty: false, label: "Path" }),
    );
    const password = normalizeOptionalSharePassword(body.password);
    if (new Set(paths).size !== paths.length) {
      throw new FilePathValidationError("File paths must be unique");
    }
    paths.forEach(assertPathNotReserved);

    if (!isShareDurationOption(body.expiresInSeconds)) {
      return jsonError(c, "Invalid share duration", 400);
    }

    if (password) {
      const passwordError = getSharePasswordValidationError(password);
      if (passwordError) {
        return jsonError(c, passwordError, 400);
      }
    }

    const { rootDirId } = await getFileContext(c);
    const objects = await Promise.all(
      paths.map((path) => c.env.FILES_BUCKET.head(getFileKey(rootDirId, path))),
    );
    const files: ShareFileTokenEntry[] = [];

    for (let index = 0; index < paths.length; index += 1) {
      const path = paths[index];
      const object = objects[index];
      if (!path || !object) {
        return jsonError(c, "File not found", 404);
      }

      files.push({
        path,
        fileName: object.customMetadata?.originalName ?? getBaseName(path),
        size: object.size,
        etag: object.etag,
      });
    }

    const fileName = getShareDisplayName(files);
    const expiresAtTimestamp = getShareExpiryTimestamp(body.expiresInSeconds);
    const token = await createShareToken(c.env, {
      rootDirId,
      fileName,
      files,
      exp: expiresAtTimestamp,
      expiresInSeconds: body.expiresInSeconds,
      password: password || undefined,
    });
    const origin = resolveAppOrigin(c.req.url, c.env);
    const response: ShareLinkResponse = {
      success: true,
      fileName,
      fileCount: files.length,
      files: getShareFileSummaries(files),
      expiresAt: new Date(expiresAtTimestamp).toISOString(),
      expiresInSeconds: body.expiresInSeconds,
      shareUrl: buildSharePageUrl(origin, token),
      passwordProtected: Boolean(password),
    };

    return jsonShareResponse(response);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to create share link", error);
    return jsonError(c, "Failed to create share link", 500);
  }
});

shares.get("/api/share-links/:token", shareTokenParamValidator, async (c) => {
  try {
    const { token } = getValidatedParam<ShareTokenParam>(c);
    const payload = await verifyShareToken(c.env, token);
    if (!payload) {
      return jsonShareError("Invalid share link", 403);
    }

    if (payload.passwordProtected) {
      return jsonShareResponse(getLockedShareResponse());
    }

    return jsonShareResponse(await resolveSharedFileMetadata(c, payload, token, false));
  } catch (error) {
    console.error("Failed to resolve share link", error);
    return jsonShareError("Failed to resolve share link", 500);
  }
});

shares.post(
  "/api/share-links/:token/unlock",
  shareTokenParamValidator,
  verifySharePasswordJsonValidator,
  async (c) => {
    try {
      const { token } = getValidatedParam<ShareTokenParam>(c);
      const body = getValidatedJson<VerifySharePasswordRequest>(c);
      const password = body.password.trim();
      const passwordError = getSharePasswordValidationError(password);
      if (passwordError) {
        return jsonShareError(passwordError, 400);
      }

      const payload = await verifyShareToken(c.env, token);
      if (!payload) {
        return jsonShareError("Invalid share link", 403);
      }

      if (!payload.passwordProtected) {
        return jsonShareError("Share link does not require a password", 400);
      }

      if ((await getFailedUnlockCount(c, token)) >= SHARE_UNLOCK_MAX_FAILURES) {
        return jsonShareError("Too many password attempts", 429);
      }

      if (!(await verifySharePassword(c.env, payload, password))) {
        await recordFailedUnlock(c, token);
        return jsonShareError("Invalid password", 403);
      }

      await clearFailedUnlocks(c, token);
      return jsonShareResponse(await resolveSharedFileMetadata(c, payload, token, true));
    } catch (error) {
      console.error("Failed to unlock share link", error);
      return jsonShareError("Failed to unlock share link", 500);
    }
  },
);

shares.get("/api/share-links/:token/download", shareTokenParamValidator, async (c) => {
  try {
    const { token } = getValidatedParam<ShareTokenParam>(c);
    const payload = await verifyShareToken(c.env, token);
    if (!payload) {
      return jsonShareError("Invalid share link", 403);
    }

    const ticket = c.req.query("ticket");
    if (payload.passwordProtected && !ticket) {
      return jsonShareError("Password required", 403);
    }

    if (isShareExpired(payload)) {
      return jsonShareError("Share link has expired", 410);
    }

    if (
      payload.passwordProtected &&
      !(await isShareDownloadTicketValid(c.env, token, payload, ticket))
    ) {
      return jsonShareError("Invalid download ticket", 403);
    }

    const fileIndex = parseShareDownloadFileIndex(c.req.query("file"), payload.files.length);
    const file = payload.files[fileIndex];
    if (!file) {
      return jsonShareError("Shared file not found", 404);
    }

    const object = await c.env.FILES_BUCKET.get(getFileKey(payload.rootDirId, file.path));
    if (!object || !object.body || object.etag !== file.etag) {
      return jsonShareError("File not found", 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    applyNoStoreHeaders(headers);
    headers.set("Content-Disposition", toContentDisposition(file.fileName));
    headers.set("ETag", object.httpEtag);
    headers.set("Last-Modified", object.uploaded.toUTCString());
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(object.body, { headers, status: 200 });
  } catch (error) {
    if (error instanceof FilePathValidationError) {
      return jsonShareError(error.message, error.status);
    }

    console.error("Failed to download shared file", error);
    return jsonShareError("Failed to download shared file", 500);
  }
});

export default shares;
