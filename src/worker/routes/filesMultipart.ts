import { Hono } from "hono";
import type { Context } from "hono";
import type {
  FileMutationResponse,
  MultipartUploadCompleteRequest,
  MultipartUploadCreateRequest,
  MultipartUploadCreateResponse,
  MultipartUploadPart,
  MultipartUploadPartResponse,
} from "../../types";
import type { AppContext } from "../context";
import {
  FilePathValidationError,
  MULTIPART_UPLOAD_PART_BYTES,
  getFileKey,
  isReservedSystemPath,
  joinRelativePath,
  normalizeName,
  normalizeRelativePath,
} from "../utils/fileManager";
import { folderExists, getFileContext, getUploadLimitBytes } from "../utils/appHelpers";
import { handlePathValidationError, jsonError } from "../utils/response";

const multipartFiles = new Hono<AppContext>();
const MULTIPART_SESSION_KEY_PREFIX = "multipart-upload:";
const MULTIPART_SESSION_TTL_SECONDS = 24 * 60 * 60;

type MultipartUploadSession = {
  allowOverwrite: boolean;
  contentType: string;
  createdAt: string;
  filePath: string;
  key: string;
  name: string;
  partCount: number;
  partSize: number;
  rootDirId: string;
  size: number;
  uploadId: string;
  uploadedParts: MultipartUploadPart[];
  userId: string;
};

function getSessionKey(uploadId: string): string {
  return `${MULTIPART_SESSION_KEY_PREFIX}${uploadId}`;
}

function assertPathNotReserved(path: string): void {
  if (isReservedSystemPath(path)) {
    throw new FilePathValidationError("Path uses a reserved system directory", 403);
  }
}

function resolveContentType(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "application/octet-stream";
}

function parseUploadSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new FilePathValidationError("File size is invalid");
  }
  return value;
}

function parsePositiveInteger(value: string | undefined, label: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new FilePathValidationError(`${label} is invalid`);
  }
  return parsed;
}

function resolveExpectedPartBytes(session: MultipartUploadSession, partNumber: number): number {
  const start = (partNumber - 1) * session.partSize;
  if (start >= session.size) {
    throw new FilePathValidationError("Part number is out of range");
  }
  return Math.min(session.partSize, session.size - start);
}

function parseContentLength(value: string | undefined): number {
  if (!value) {
    throw new FilePathValidationError("Content-Length header is required", 411);
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || String(parsed) !== value) {
    throw new FilePathValidationError("Invalid Content-Length header");
  }
  return parsed;
}

function isMultipartUploadPart(value: unknown): value is MultipartUploadPart {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<MultipartUploadPart>;
  return (
    typeof candidate.partNumber === "number" &&
    Number.isInteger(candidate.partNumber) &&
    candidate.partNumber > 0 &&
    typeof candidate.etag === "string" &&
    candidate.etag.length > 0
  );
}

function isMultipartUploadSession(value: unknown): value is MultipartUploadSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<MultipartUploadSession>;
  return (
    typeof candidate.uploadId === "string" &&
    typeof candidate.userId === "string" &&
    typeof candidate.rootDirId === "string" &&
    typeof candidate.key === "string" &&
    typeof candidate.filePath === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.partSize === "number" &&
    typeof candidate.partCount === "number" &&
    typeof candidate.contentType === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.allowOverwrite === "boolean" &&
    Array.isArray(candidate.uploadedParts) &&
    candidate.uploadedParts.every(isMultipartUploadPart)
  );
}

async function saveMultipartSession(
  c: Context<AppContext>,
  session: MultipartUploadSession,
): Promise<void> {
  await c.env.FILE_YARD_KV.put(getSessionKey(session.uploadId), JSON.stringify(session), {
    expirationTtl: MULTIPART_SESSION_TTL_SECONDS,
  });
}

async function loadMultipartSession(
  c: Context<AppContext>,
  uploadId: string,
): Promise<MultipartUploadSession | null> {
  const raw = await c.env.FILE_YARD_KV.get(getSessionKey(uploadId));
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isMultipartUploadSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function requireOwnedMultipartSession(
  c: Context<AppContext>,
  uploadId: string,
): Promise<MultipartUploadSession | Response> {
  const session = await loadMultipartSession(c, uploadId);
  if (!session) {
    return jsonError(c, "Multipart upload not found", 404);
  }

  const { rootDirId, user } = await getFileContext(c);
  if (session.userId !== user.id || session.rootDirId !== rootDirId) {
    return jsonError(c, "Multipart upload not found", 404);
  }

  return session;
}

function mergeUploadedPart(
  parts: MultipartUploadPart[],
  nextPart: MultipartUploadPart,
): MultipartUploadPart[] {
  return [...parts.filter((part) => part.partNumber !== nextPart.partNumber), nextPart].sort(
    (a, b) => a.partNumber - b.partNumber,
  );
}

function validateCompleteParts(
  session: MultipartUploadSession,
  parts: MultipartUploadPart[],
): Response | undefined {
  if (parts.length !== session.partCount) {
    return new Response(
      JSON.stringify({ success: false, error: "Multipart upload is incomplete" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const storedEtags = new Map(session.uploadedParts.map((part) => [part.partNumber, part.etag]));
  const providedParts = new Map(parts.map((part) => [part.partNumber, part]));
  if (providedParts.size !== parts.length) {
    return new Response(
      JSON.stringify({ success: false, error: "Multipart upload parts are invalid" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  for (let partNumber = 1; partNumber <= session.partCount; partNumber++) {
    const part = providedParts.get(partNumber);
    if (!part || storedEtags.get(partNumber) !== part.etag) {
      return new Response(
        JSON.stringify({ success: false, error: "Multipart upload parts do not match" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  return undefined;
}

function getParentPath(path: string): string {
  const segments = path.split("/");
  segments.pop();
  return segments.join("/");
}

async function abortMultipartSession(
  c: Context<AppContext>,
  session: MultipartUploadSession,
): Promise<void> {
  const upload = c.env.FILES_BUCKET.resumeMultipartUpload(session.key, session.uploadId);
  await upload.abort().catch(() => undefined);
  await c.env.FILE_YARD_KV.delete(getSessionKey(session.uploadId));
}

multipartFiles.post("/api/files/multipart", async (c) => {
  try {
    const body = await c.req.json<MultipartUploadCreateRequest>();
    const parentPath = normalizeRelativePath(body.parentPath, {
      allowEmpty: true,
      label: "Parent path",
    });
    assertPathNotReserved(parentPath);
    const name = normalizeName(body.name, "File name");
    const filePath = joinRelativePath(parentPath, name);
    assertPathNotReserved(filePath);

    const size = parseUploadSize(body.size);
    if (size === 0) {
      return jsonError(c, "Multipart upload requires a non-empty file", 400);
    }
    if (size > getUploadLimitBytes(c.env)) {
      return jsonError(c, "File exceeds the upload size limit", 413);
    }

    const { rootDirId, user } = await getFileContext(c);
    if (!(await folderExists(c.env, rootDirId, parentPath))) {
      return jsonError(c, "Parent folder not found", 404);
    }
    if (await folderExists(c.env, rootDirId, filePath)) {
      return jsonError(c, "A folder with this name already exists", 409);
    }

    const allowOverwrite = body.overwrite === true;
    const fileKey = getFileKey(rootDirId, filePath);
    const existingObject = await c.env.FILES_BUCKET.head(fileKey);
    if (existingObject && !allowOverwrite) {
      return jsonError(c, "A file with this name already exists", 409);
    }

    const createdAt = existingObject?.customMetadata?.createdAt ?? new Date().toISOString();
    const contentType = resolveContentType(body.contentType);
    const upload = await c.env.FILES_BUCKET.createMultipartUpload(fileKey, {
      customMetadata: { originalName: name, createdAt },
      httpMetadata: { contentType },
    });

    const session: MultipartUploadSession = {
      allowOverwrite,
      contentType,
      createdAt,
      filePath,
      key: fileKey,
      name,
      partCount: Math.ceil(size / MULTIPART_UPLOAD_PART_BYTES),
      partSize: MULTIPART_UPLOAD_PART_BYTES,
      rootDirId,
      size,
      uploadId: upload.uploadId,
      uploadedParts: [],
      userId: user.id,
    };
    await saveMultipartSession(c, session);

    const response: MultipartUploadCreateResponse = {
      success: true,
      uploadId: upload.uploadId,
      partSize: session.partSize,
      partCount: session.partCount,
    };
    return c.json(response, 201);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to create multipart upload", error);
    return jsonError(c, "Failed to create multipart upload", 500);
  }
});

multipartFiles.put("/api/files/multipart/part", async (c) => {
  try {
    const uploadId = c.req.query("uploadId");
    if (!uploadId) {
      return jsonError(c, "Upload ID is required", 400);
    }
    const session = await requireOwnedMultipartSession(c, uploadId);
    if (session instanceof Response) {
      return session;
    }

    const partNumber = parsePositiveInteger(c.req.query("partNumber"), "Part number");
    const expectedBytes = resolveExpectedPartBytes(session, partNumber);
    const contentLength = parseContentLength(c.req.header("content-length"));
    if (contentLength !== expectedBytes) {
      return jsonError(c, "Part size does not match the expected size", 400);
    }

    const body = c.req.raw.body;
    if (!body) {
      return jsonError(c, "Part body is required", 400);
    }

    const upload = c.env.FILES_BUCKET.resumeMultipartUpload(session.key, uploadId);
    const uploadedPart = await upload.uploadPart(partNumber, body);
    session.uploadedParts = mergeUploadedPart(session.uploadedParts, uploadedPart);
    await saveMultipartSession(c, session);

    const response: MultipartUploadPartResponse = {
      success: true,
      part: uploadedPart,
      uploadedBytes: expectedBytes,
    };
    return c.json(response);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to upload multipart part", error);
    return jsonError(c, "Failed to upload multipart part", 500);
  }
});

multipartFiles.post("/api/files/multipart/complete", async (c) => {
  try {
    const body = await c.req.json<MultipartUploadCompleteRequest>();
    const uploadId = body.uploadId;
    if (!uploadId) {
      return jsonError(c, "Upload ID is required", 400);
    }
    if (!Array.isArray(body.parts) || !body.parts.every(isMultipartUploadPart)) {
      return jsonError(c, "Multipart upload parts are invalid", 400);
    }

    const session = await requireOwnedMultipartSession(c, uploadId);
    if (session instanceof Response) {
      return session;
    }

    const partsError = validateCompleteParts(session, body.parts);
    if (partsError) {
      return partsError;
    }

    const parentPath = getParentPath(session.filePath);
    if (!(await folderExists(c.env, session.rootDirId, parentPath))) {
      await abortMultipartSession(c, session);
      return jsonError(c, "Parent folder not found", 404);
    }

    if (!session.allowOverwrite && (await c.env.FILES_BUCKET.head(session.key))) {
      await abortMultipartSession(c, session);
      return jsonError(c, "A file with this name already exists", 409);
    }

    const upload = c.env.FILES_BUCKET.resumeMultipartUpload(session.key, uploadId);
    await upload.complete(body.parts);
    await c.env.FILE_YARD_KV.delete(getSessionKey(uploadId));

    const response: FileMutationResponse = {
      success: true,
      message: "File uploaded successfully",
    };
    return c.json(response, 201);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to complete multipart upload", error);
    return jsonError(c, "Failed to complete multipart upload", 500);
  }
});

multipartFiles.delete("/api/files/multipart", async (c) => {
  try {
    const uploadId = c.req.query("uploadId");
    if (!uploadId) {
      return jsonError(c, "Upload ID is required", 400);
    }

    const session = await requireOwnedMultipartSession(c, uploadId);
    if (session instanceof Response) {
      return session;
    }

    await abortMultipartSession(c, session);

    return new Response(null, { status: 204 });
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to abort multipart upload", error);
    return jsonError(c, "Failed to abort multipart upload", 500);
  }
});

export default multipartFiles;
