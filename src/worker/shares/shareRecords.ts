import { eq, lte } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import type { ShareDurationOption } from "../../types";
import type { AppDatabase } from "../db/client";
import { fileShare, type FileShareRecordFile } from "../db/schema";
import { createShareId } from "../utils/shareLinks";

export type FileShareRecord = InferSelectModel<typeof fileShare>;
export type { FileShareRecordFile };

type CreateFileShareRecordInput = {
  ownerUserId: string;
  rootDirId: string;
  displayName: string;
  files: FileShareRecordFile[];
  startsAt: Date;
  expiresAt: Date;
  expiresInSeconds: ShareDurationOption;
  passwordProtected: boolean;
  passwordSalt?: string;
  passwordVerifier?: string;
};

function isValidFileShareRecordFile(value: unknown): value is FileShareRecordFile {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as FileShareRecordFile).path === "string" &&
    typeof (value as FileShareRecordFile).fileName === "string" &&
    typeof (value as FileShareRecordFile).size === "number" &&
    Number.isInteger((value as FileShareRecordFile).size) &&
    (value as FileShareRecordFile).size >= 0 &&
    typeof (value as FileShareRecordFile).etag === "string"
  );
}

function hasValidFiles(record: FileShareRecord | undefined): record is FileShareRecord {
  return Boolean(
    record &&
      Array.isArray(record.files) &&
      record.files.length > 0 &&
      record.files.every(isValidFileShareRecordFile),
  );
}

export async function createFileShareRecord(
  db: AppDatabase,
  input: CreateFileShareRecordInput,
): Promise<FileShareRecord> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = createShareId();
    const inserted = await db
      .insert(fileShare)
      .values({
        id,
        ownerUserId: input.ownerUserId,
        rootDirId: input.rootDirId,
        displayName: input.displayName,
        files: input.files,
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
        expiresInSeconds: input.expiresInSeconds,
        passwordProtected: input.passwordProtected,
        passwordSalt: input.passwordSalt,
        passwordVerifier: input.passwordVerifier,
      })
      .onConflictDoNothing({
        target: fileShare.id,
      })
      .returning();

    if (inserted[0]) {
      return inserted[0];
    }
  }

  throw new Error("Failed to create share record after multiple attempts");
}

export async function findFileShareById(
  db: AppDatabase,
  id: string,
): Promise<FileShareRecord | undefined> {
  const record = await db.query.fileShare.findFirst({
    where: eq(fileShare.id, id),
  });

  return hasValidFiles(record) ? record : undefined;
}

export async function cleanupExpiredFileShares(
  db: AppDatabase,
  now = Date.now(),
): Promise<number> {
  const deleted = await db
    .delete(fileShare)
    .where(lte(fileShare.expiresAt, new Date(now)))
    .returning({ id: fileShare.id });

  return deleted.length;
}
