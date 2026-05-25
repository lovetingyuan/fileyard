import type { Context } from "hono";
import type {
  FileMutationResponse,
  MultipartUploadCompleteRequest,
  MultipartUploadCreateRequest,
  MultipartUploadCreateResponse,
  MultipartUploadPartResponse,
} from "../../types";
import type { AppContext } from "../context";
import { folderExists, getFileContext, getUploadLimitBytes } from "../utils/appHelpers";
import {
  FilePathValidationError,
  MULTIPART_UPLOAD_PART_BYTES,
  getFileKey,
  isReservedSystemPath,
  joinRelativePath,
  normalizeName,
  normalizeRelativePath,
} from "../utils/fileManager";
import { handlePathValidationError, jsonError } from "../utils/response";
import {
  abortMultipartSession,
  isMultipartUploadPart,
  mergeUploadedPart,
  requireOwnedMultipartSession,
  resolveExpectedPartBytes,
  saveMultipartSession,
  validateCompleteParts,
  type MultipartUploadSession,
} from "./filesMultipartSession";

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

function getParentPath(path: string): string {
  const segments = path.split("/");
  segments.pop();
  return segments.join("/");
}

export async function createMultipartUpload(c: Context<AppContext>) {
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
}

export async function uploadMultipartPart(c: Context<AppContext>) {
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
}

export async function completeMultipartUpload(c: Context<AppContext>) {
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
    await c.env.FILE_YARD_KV.delete(`multipart-upload:${uploadId}`);

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
}

export async function abortMultipartUpload(c: Context<AppContext>) {
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
}
