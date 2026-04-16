import { Hono } from "hono";
import type { Context } from "hono";
import { csrf } from "hono/csrf";
import { authMiddleware, requireAuth } from "./auth/middleware";
import { getAuth } from "./auth";
import type { AppContext } from "./context";
import { applyCorsHeaders, applyCorsHeadersToResponse, isAllowedOrigin } from "./utils/appHelpers";
import { normalizeDevPostUnauthorizedResponse } from "./utils/devResponseWorkarounds";
import { jsonError } from "./utils/response";
import { applySecurityHeadersToResponse } from "./utils/securityHeaders";
import adminRoutes from "./routes/admin";
import profileRoutes from "./routes/profile";
import fileRoutes from "./routes/files";
import shareRoutes from "./routes/shares";

const app = new Hono<AppContext>();

app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.use("*", async (c, next) => {
  await next();
  c.res = normalizeDevPostUnauthorizedResponse(c.res, c.req.method, c.req.url);
  c.res = applySecurityHeadersToResponse(c.res, c.req.url);
});

app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth/")) {
    return next();
  }

  const origin = c.req.header("Origin");
  if (origin && !isAllowedOrigin(c, origin)) {
    return jsonError(c, "Origin not allowed", 403);
  }

  if (c.req.method === "OPTIONS") {
    const headers = new Headers();
    if (origin) {
      applyCorsHeaders(headers, origin);
    }
    return new Response(null, { status: 204, headers });
  }

  await next();

  if (origin && isAllowedOrigin(c, origin)) {
    c.res = applyCorsHeadersToResponse(c.res, origin);
  }
});

app.use(
  "/api/profile",
  csrf({
    origin: (origin, c) => isAllowedOrigin(c as Context<AppContext>, origin),
  }),
);
app.use(
  "/api/profile/*",
  csrf({
    origin: (origin, c) => isAllowedOrigin(c as Context<AppContext>, origin),
  }),
);
app.use(
  "/api/files",
  csrf({
    origin: (origin, c) => isAllowedOrigin(c as Context<AppContext>, origin),
  }),
);
app.use(
  "/api/files/*",
  csrf({
    origin: (origin, c) => isAllowedOrigin(c as Context<AppContext>, origin),
  }),
);
app.use(
  "/api/admin",
  csrf({
    origin: (origin, c) => isAllowedOrigin(c as Context<AppContext>, origin),
  }),
);
app.use(
  "/api/admin/*",
  csrf({
    origin: (origin, c) => isAllowedOrigin(c as Context<AppContext>, origin),
  }),
);

app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  return getAuth(c).handler(c.req.raw);
});

app.use("/api/profile", authMiddleware());
app.use("/api/profile/*", authMiddleware());
app.use("/api/files", authMiddleware());
app.use("/api/files/*", authMiddleware());
app.use("/api/admin", authMiddleware());
app.use("/api/admin/*", authMiddleware());
app.use("/api/profile", requireAuth());
app.use("/api/profile/*", requireAuth());
app.use("/api/files", requireAuth());
app.use("/api/files/*", requireAuth());
app.use("/api/admin", requireAuth());
app.use("/api/admin/*", requireAuth());

app.route("/", adminRoutes);
app.route("/", profileRoutes);
app.route("/", fileRoutes);
app.route("/", shareRoutes);
app.all("/api/*", (c) => jsonError(c, "Not found", 404));
app.all("*", async (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
