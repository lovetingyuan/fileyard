import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AdminUserListResponse } from "../../types";
import type { AppContext } from "../context";
import { createDb } from "../db/client";
import { session, user } from "../db/schema";
import { jsonError } from "../utils/response";
import { isAdminUser } from "../utils/adminAuth";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: string | null | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function toIsoString(value: Date | number | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

const adminRoutes = new Hono<AppContext>();

adminRoutes.get("/admin/users", (c) => {
  const url = new URL(c.req.url);
  url.pathname = "/admin/users/";
  return Response.redirect(url.toString(), 308);
});

adminRoutes.get("/api/admin/users", async (c) => {
  const currentUser = c.get("user");
  if (!currentUser) {
    return jsonError(c, "Unauthorized", 401);
  }

  if (!(await isAdminUser(c.env, currentUser.email))) {
    return jsonError(c, "Forbidden", 403);
  }

  const page = parsePositiveInt(c.req.query("page"), DEFAULT_PAGE);
  const pageSize = Math.min(
    parsePositiveInt(c.req.query("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const offset = (page - 1) * pageSize;
  const db = createDb(c.env);

  const rows = await db
    .select({
      createdAt: user.createdAt,
      email: user.email,
      lastLoginAt: sql<number | null>`max(${session.createdAt})`,
    })
    .from(user)
    .leftJoin(session, eq(session.userId, user.id))
    .groupBy(user.id, user.email, user.createdAt)
    .orderBy(desc(user.createdAt), desc(user.email))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db
    .select({
      total: sql<number>`count(*)`,
    })
    .from(user);

  const response: AdminUserListResponse = {
    success: true,
    items: rows.map((row) => ({
      email: row.email,
      createdAt: toIsoString(row.createdAt) ?? new Date(0).toISOString(),
      lastLoginAt: toIsoString(row.lastLoginAt),
    })),
    page,
    pageSize,
    total: Number(totalRow?.total ?? 0),
  };

  return c.json(response);
});

export default adminRoutes;
