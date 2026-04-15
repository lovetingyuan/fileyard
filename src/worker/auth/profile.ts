import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { appUserProfile } from "../db/schema";
import { generateRootDirId } from "../utils/token";

export type AppProfile = InferSelectModel<typeof appUserProfile>;

async function findAppProfile(db: AppDatabase, userId: string): Promise<AppProfile | undefined> {
  return db.query.appUserProfile.findFirst({
    where: eq(appUserProfile.userId, userId),
  });
}

export async function getOrCreateAppProfileByDb(
  db: AppDatabase,
  userId: string,
  _email: string,
): Promise<AppProfile> {
  const existing = await findAppProfile(db, userId);
  if (existing) {
    return existing;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const rootDirId = generateRootDirId();

    try {
      const inserted = await db
        .insert(appUserProfile)
        .values({
          userId,
          rootDirId,
        })
        .onConflictDoNothing({
          target: appUserProfile.userId,
        })
        .returning();

      if (inserted[0]) {
        return inserted[0];
      }

      const raced = await findAppProfile(db, userId);
      if (raced) {
        return raced;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("UNIQUE constraint failed") || message.includes("app_user_profile.root_dir_id")) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Failed to create app profile after multiple attempts");
}
