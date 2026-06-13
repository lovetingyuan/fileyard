import type { AppBindings } from "../context";
import { createDb } from "../db/client";
import { cleanupExpiredFileShares } from "./shareRecords";

export async function cleanupExpiredShares(env: AppBindings, now = Date.now()): Promise<number> {
  const deletedCount = await cleanupExpiredFileShares(createDb(env), now);
  console.log(
    JSON.stringify({
      event: "expired_shares_cleanup",
      deletedCount,
    }),
  );
  return deletedCount;
}
