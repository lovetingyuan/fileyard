import { drizzle } from "drizzle-orm/d1";
import type { AppBindings } from "../context";
import * as schema from "./schema";

export type AppDatabase = ReturnType<typeof createDb>;

export function createDb(env: Pick<AppBindings, "AUTH_DB">) {
  return drizzle(env.AUTH_DB, {
    schema,
  });
}
