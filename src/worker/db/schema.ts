import { index, uniqueIndex, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { ShareDurationOption } from "../../types";
import { user, session, account, verification, rateLimit } from "./auth-schema";

export { account, rateLimit, session, user, verification };

export const appUserProfile = sqliteTable(
  "app_user_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    rootDirId: text("root_dir_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("app_user_profile_root_dir_id_unique").on(table.rootDirId)],
);

export type FileShareRecordFile = {
  path: string;
  fileName: string;
  size: number;
  etag: string;
};

export const fileShare = sqliteTable(
  "file_share",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    rootDirId: text("root_dir_id").notNull(),
    displayName: text("display_name").notNull(),
    files: text("files", { mode: "json" }).$type<FileShareRecordFile[]>().notNull(),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    expiresInSeconds: integer("expires_in_seconds").$type<ShareDurationOption>().notNull(),
    passwordProtected: integer("password_protected", { mode: "boolean" }).notNull(),
    passwordSalt: text("password_salt"),
    passwordVerifier: text("password_verifier"),
  },
  (table) => [index("file_share_expires_at_idx").on(table.expiresAt)],
);
