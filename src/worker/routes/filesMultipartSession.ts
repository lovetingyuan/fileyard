import type { Context } from "hono";
import type { MultipartUploadPart } from "../../types";
import type { AppContext } from "../context";
import { getFileContext } from "../utils/appHelpers";
import { FilePathValidationError } from "../utils/fileManager";
import { jsonError } from "../utils/response";

const MULTIPART_SESSION_KEY_PREFIX = "multipart-upload:";
const MULTIPART_SESSION_TTL_SECONDS = 24 * 60 * 60;

export type MultipartUploadSession = {
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

export function resolveExpectedPartBytes(
  session: MultipartUploadSession,
  partNumber: number,
): number {
  const start = (partNumber - 1) * session.partSize;
  if (start >= session.size) {
    throw new FilePathValidationError("Part number is out of range");
  }
  return Math.min(session.partSize, session.size - start);
}

export function isMultipartUploadPart(value: unknown): value is MultipartUploadPart {
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

export async function saveMultipartSession(
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

export async function requireOwnedMultipartSession(
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

export function mergeUploadedPart(
  parts: MultipartUploadPart[],
  nextPart: MultipartUploadPart,
): MultipartUploadPart[] {
  return [...parts.filter((part) => part.partNumber !== nextPart.partNumber), nextPart].sort(
    (a, b) => a.partNumber - b.partNumber,
  );
}

export function validateCompleteParts(
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

export async function abortMultipartSession(
  c: Context<AppContext>,
  session: MultipartUploadSession,
): Promise<void> {
  const upload = c.env.FILES_BUCKET.resumeMultipartUpload(session.key, session.uploadId);
  await upload.abort().catch(() => undefined);
  await c.env.FILE_YARD_KV.delete(getSessionKey(session.uploadId));
}
