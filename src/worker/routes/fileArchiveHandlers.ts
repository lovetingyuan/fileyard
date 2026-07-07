import { downloadZip } from "client-zip";
import type { Context } from "hono";
import type {
  BatchOperationRequestTarget,
  CreateArchiveDownloadRequest,
  CreateArchiveDownloadResponse,
} from "../../types";
import type { AppContext } from "../context";
import { folderExists, getFileContext } from "../utils/appHelpers";
import {
  assertFolderSubtreeAccess,
  assertPathAccess,
  handleFolderPasswordError,
} from "../utils/folderPasswords";
import {
  FilePathValidationError,
  getBaseName,
  getFileKey,
  getFolderPrefix,
  toContentDisposition,
} from "../utils/fileManager";
import { handlePathValidationError, jsonError } from "../utils/response";
import { getValidatedJson } from "../validation";
import { normalizeBatchTargets } from "./fileBatchOperationHelpers";
import {
  createArchiveEntries,
  dedupeArchiveTargets,
  type ArchiveEntry,
} from "./fileArchiveHelpers";
import { assertPathNotReserved, listAllObjects } from "./filesShared";

const ARCHIVE_TICKET_VERSION = 1;
const ARCHIVE_TICKET_TTL_SECONDS = 120;
const ARCHIVE_TICKET_TTL_MS = ARCHIVE_TICKET_TTL_SECONDS * 1000;
const ARCHIVE_TICKET_KEY_PREFIX = "archive-download:";
const ARCHIVE_TICKET_BYTES = 16;

type ArchiveTicketRecord = {
  v: typeof ARCHIVE_TICKET_VERSION;
  type: "archive-download";
  userId: string;
  rootDirId: string;
  targets: BatchOperationRequestTarget[];
  fileName: string;
  exp: number;
};

type ZipInput =
  | {
      input: ReadableStream<Uint8Array>;
      lastModified: Date;
      name: string;
      size: number;
    }
  | {
      lastModified: Date;
      name: string;
    };

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createArchiveTicketId(): string {
  const bytes = new Uint8Array(ARCHIVE_TICKET_BYTES);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function getArchiveTicketKey(ticket: string): string {
  return `${ARCHIVE_TICKET_KEY_PREFIX}${ticket}`;
}

function isArchiveTicketId(value: string): boolean {
  return /^[a-f0-9]{32}$/u.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArchiveTarget(value: unknown): value is BatchOperationRequestTarget {
  return (
    isRecord(value) &&
    (value.type === "file" || value.type === "folder") &&
    typeof value.path === "string"
  );
}

function parseArchiveTicketRecord(raw: string | null): ArchiveTicketRecord | null {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as unknown;
    if (
      !isRecord(value) ||
      value.v !== ARCHIVE_TICKET_VERSION ||
      value.type !== "archive-download" ||
      typeof value.userId !== "string" ||
      typeof value.rootDirId !== "string" ||
      typeof value.fileName !== "string" ||
      typeof value.exp !== "number" ||
      !Number.isInteger(value.exp) ||
      !Array.isArray(value.targets) ||
      !value.targets.every(isArchiveTarget)
    ) {
      return null;
    }

    return {
      v: ARCHIVE_TICKET_VERSION,
      type: "archive-download",
      userId: value.userId,
      rootDirId: value.rootDirId,
      targets: value.targets,
      fileName: value.fileName,
      exp: value.exp,
    };
  } catch {
    return null;
  }
}

function getArchiveFileName(targets: BatchOperationRequestTarget[]): string {
  if (targets.length === 1) {
    return `${getBaseName(targets[0]?.path ?? "download")}.zip`;
  }

  return "fileyard-download.zip";
}

function getArchiveDownloadUrl(ticket: string): string {
  return `/api/files/archive-downloads/${encodeURIComponent(ticket)}`;
}

function applyArchiveHeaders(headers: Headers, fileName: string): Headers {
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Disposition", toContentDisposition(fileName));
  headers.set("Content-Type", "application/zip");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

async function assertArchiveTargetsAvailable(
  c: Context<AppContext>,
  rootDirId: string,
  targets: BatchOperationRequestTarget[],
): Promise<void> {
  for (const target of targets) {
    assertPathNotReserved(target.path);

    if (target.type === "file") {
      await assertPathAccess(c, rootDirId, target.path);
      const object = await c.env.FILES_BUCKET.head(getFileKey(rootDirId, target.path));
      if (!object) {
        throw new FilePathValidationError("File not found", 404);
      }
      continue;
    }

    await assertFolderSubtreeAccess(c, rootDirId, target.path);
    if (!(await folderExists(c.env, rootDirId, target.path))) {
      throw new FilePathValidationError("Folder not found", 404);
    }
  }
}

async function collectArchiveObjects(
  bucket: R2Bucket,
  rootDirId: string,
  targets: BatchOperationRequestTarget[],
): Promise<R2Object[]> {
  const objects: R2Object[] = [];

  for (const target of targets) {
    if (target.type === "file") {
      const object = await bucket.head(getFileKey(rootDirId, target.path));
      if (!object) {
        throw new FilePathValidationError("File not found", 404);
      }
      objects.push(object);
      continue;
    }

    objects.push(...(await listAllObjects(bucket, getFolderPrefix(rootDirId, target.path))));
  }

  return objects;
}

async function* getArchiveInputs(
  bucket: R2Bucket,
  entries: ArchiveEntry[],
): AsyncGenerator<ZipInput> {
  for (const entry of entries) {
    if (entry.kind === "folder") {
      yield {
        name: entry.name,
        lastModified: entry.lastModified,
      };
      continue;
    }

    const object = await bucket.get(entry.key);
    if (!object?.body) {
      throw new FilePathValidationError("File not found", 404);
    }

    yield {
      name: entry.name,
      size: entry.size,
      lastModified: entry.lastModified,
      input: object.body,
    };
  }
}

export async function createArchiveDownloadTicket(c: Context<AppContext>) {
  try {
    const body = getValidatedJson<CreateArchiveDownloadRequest>(c);
    const targets = dedupeArchiveTargets(normalizeBatchTargets(body.targets));
    const { rootDirId, user } = await getFileContext(c);
    await assertArchiveTargetsAvailable(c, rootDirId, targets);

    const ticket = createArchiveTicketId();
    const expiresAt = Date.now() + ARCHIVE_TICKET_TTL_MS;
    const fileName = getArchiveFileName(targets);
    const record: ArchiveTicketRecord = {
      v: ARCHIVE_TICKET_VERSION,
      type: "archive-download",
      userId: user.id,
      rootDirId,
      targets,
      fileName,
      exp: expiresAt,
    };
    await c.env.FILE_YARD_KV.put(getArchiveTicketKey(ticket), JSON.stringify(record), {
      expirationTtl: ARCHIVE_TICKET_TTL_SECONDS,
    });

    const response: CreateArchiveDownloadResponse = {
      success: true,
      downloadUrl: getArchiveDownloadUrl(ticket),
      fileName,
      expiresAt: new Date(expiresAt).toISOString(),
    };
    return c.json(response, 200, {
      "Cache-Control": "private, no-store",
    });
  } catch (error) {
    const folderPasswordError = handleFolderPasswordError(error);
    if (folderPasswordError) {
      return folderPasswordError;
    }
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to create archive download ticket", error);
    return jsonError(c, "Failed to create archive download", 500);
  }
}

export async function downloadArchive(c: Context<AppContext>) {
  try {
    const ticket = c.req.param("ticket") ?? "";
    if (!isArchiveTicketId(ticket)) {
      return jsonError(c, "Invalid archive download ticket", 403);
    }

    const record = parseArchiveTicketRecord(
      await c.env.FILE_YARD_KV.get(getArchiveTicketKey(ticket)),
    );
    if (!record) {
      return jsonError(c, "Invalid archive download ticket", 403);
    }
    if (Date.now() >= record.exp) {
      return jsonError(c, "Archive download ticket has expired", 410);
    }

    const { rootDirId, user } = await getFileContext(c);
    if (record.userId !== user.id || record.rootDirId !== rootDirId) {
      return jsonError(c, "Invalid archive download ticket", 403);
    }

    const targets = dedupeArchiveTargets(record.targets);
    for (const target of targets) {
      assertPathNotReserved(target.path);
      if (target.type === "folder" && !(await folderExists(c.env, rootDirId, target.path))) {
        throw new FilePathValidationError("Folder not found", 404);
      }
    }

    const objects = await collectArchiveObjects(c.env.FILES_BUCKET, rootDirId, targets);
    const entries = createArchiveEntries(rootDirId, targets, objects);
    if (entries.length === 0) {
      throw new FilePathValidationError("Archive is empty", 404);
    }

    const zipResponse = downloadZip(getArchiveInputs(c.env.FILES_BUCKET, entries));
    const headers = applyArchiveHeaders(new Headers(zipResponse.headers), record.fileName);

    return new Response(zipResponse.body, { headers, status: 200 });
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to download archive", error);
    return jsonError(c, "Failed to download archive", 500);
  }
}
