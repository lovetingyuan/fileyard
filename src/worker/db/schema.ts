import { uniqueIndex, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
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
