import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import type { AppContext } from "../context";
import { sendVerificationEmail } from "../utils/email";
import {
  generateSalt,
  hashPassword,
  validateEmail,
  validatePassword,
  verifyPassword,
} from "../utils/password";
import { jsonError } from "../utils/response";

const auth = new Hono<AppContext>();

auth.post("/api/auth/register", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const { email, password } = body;

  if (!email || !validateEmail(email)) {
    return jsonError(c, "Invalid email address", 400);
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return jsonError(c, passwordValidation.errors.join(", "), 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const stub = c.env.USER_DO.getByName(normalizedEmail);
  const existingUser = await stub.getUser();
  if (existingUser) {
    return jsonError(c, "An account with this email already exists", 400);
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const createResult = await stub.createUser(normalizedEmail, passwordHash, salt);
  if (!createResult.success) {
    return jsonError(c, createResult.error ?? "Failed to create user", 400);
  }

  const resendApiKey = c.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return jsonError(c, "Email delivery is not configured", 500);
  }

  const verificationToken = await stub.createVerificationToken("email");
  const appUrl = c.env.APP_URL ?? new URL(c.req.url).origin;
  const senderEmail = c.env.SENDER_EMAIL ?? "fileshare@tingyuan.in";

  await sendVerificationEmail(
    { to: normalizedEmail, verificationToken, appUrl },
    resendApiKey,
    senderEmail,
  );

  return c.json({
    success: true,
    message: "Registration successful! Please check your email to verify your account.",
  });
});

auth.post("/api/auth/login", async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string }>();
    const { email, password } = body;

    if (!email || !password) {
      return jsonError(c, "Email and password are required", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const stub = c.env.USER_DO.getByName(normalizedEmail);
    const user = await stub.getUser();

    if (!user) {
      return jsonError(c, "Invalid email or password", 400);
    }

    if (!user.verified) {
      return jsonError(c, "Please verify your email before logging in", 403);
    }

    const isValid = await verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return jsonError(c, "Invalid email or password", 400);
    }

    const session = await stub.createSession();
    const isProduction = c.env.ENVIRONMENT === "production";
    const cookieOptions = {
      path: "/",
      secure: isProduction,
      httpOnly: true,
      sameSite: "Strict" as const,
      maxAge: 30 * 24 * 60 * 60,
    };

    setCookie(c, "session_token", session.token, cookieOptions);
    setCookie(c, "user_email", normalizedEmail, cookieOptions);

    return c.json({
      success: true,
      message: "Login successful",
      user: { email: user.email, verified: user.verified },
    });
  } catch (error) {
    console.error("Login route failed", error);
    return jsonError(c, error instanceof Error ? error.message : "Login failed", 500);
  }
});

auth.post("/api/auth/logout", async (c) => {
  const sessionToken = c.get("sessionToken");
  const userEmail = c.get("userEmail");

  if (sessionToken && userEmail) {
    const stub = c.env.USER_DO.getByName(userEmail);
    await stub.deleteSession(sessionToken);
  }

  deleteCookie(c, "session_token");
  deleteCookie(c, "user_email");

  return c.json({ success: true, message: "Logged out successfully" });
});

auth.get("/api/auth/verify/:token", async (c) => {
  const token = c.req.param("token");

  if (!token) {
    return c.redirect("/login?error=Invalid verification link");
  }

  return jsonError(
    c,
    "Email required for verification. Please use the verification link from your email.",
    400,
  );
});

auth.post("/api/auth/verify", async (c) => {
  const body = await c.req.json<{ token: string; email: string }>();
  const { token, email } = body;

  if (!token || !email) {
    return jsonError(c, "Token and email are required", 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const stub = c.env.USER_DO.getByName(normalizedEmail);
  const verification = await stub.consumeVerificationToken(token);
  if (!verification) {
    return jsonError(c, "Invalid or expired verification token", 400);
  }

  await stub.verifyEmail();

  return c.json({ success: true, message: "Email verified successfully" });
});

auth.get("/api/auth/me", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }
  return c.json({
    success: true,
    user: { email: user.email, verified: user.verified, createdAt: user.createdAt },
  });
});

auth.post("/api/auth/resend-verification", async (c) => {
  const body = await c.req.json<{ email: string }>();
  const { email } = body;

  if (!email || !validateEmail(email)) {
    return jsonError(c, "Invalid email address", 400);
  }

  const resendApiKey = c.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return jsonError(c, "Email delivery is not configured", 500);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const stub = c.env.USER_DO.getByName(normalizedEmail);
  const user = await stub.getUser();

  if (!user) {
    return c.json({
      success: true,
      message: "If an account exists, a verification email has been sent.",
    });
  }

  if (user.verified) {
    return jsonError(c, "Email is already verified", 400);
  }

  const verificationToken = await stub.createVerificationToken("email");
  const appUrl = c.env.APP_URL ?? new URL(c.req.url).origin;
  const senderEmail = c.env.SENDER_EMAIL ?? "fileshare@tingyuan.in";

  await sendVerificationEmail(
    { to: normalizedEmail, verificationToken, appUrl },
    resendApiKey,
    senderEmail,
  );

  return c.json({
    success: true,
    message: "If an account exists, a verification email has been sent.",
  });
});

export default auth;
