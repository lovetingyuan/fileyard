import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { createBetterAuthOptions } from "./src/worker/auth/options";

const cliBaseUrl = process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:5173";
const cliSecret = process.env.BETTER_AUTH_SECRET || "better-auth-development-secret-for-cli-only";

const cliDb = drizzle({
  prepare() {
    throw new Error("Better Auth CLI placeholder database should not execute queries.");
  },
  batch() {
    throw new Error("Better Auth CLI placeholder database should not execute queries.");
  },
} as never);

export const auth = betterAuth({
  ...createBetterAuthOptions({
    appName: "File Share",
    baseURL: cliBaseUrl,
    secret: cliSecret,
    googleClientId: process.env.GOOGLE_CLIENT_ID || "google-client-id",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "google-client-secret",
    trustedOrigins: [new URL(cliBaseUrl).origin],
    sendVerificationEmail: async () => {},
    sendResetPassword: async () => {},
  }),
  database: drizzleAdapter(cliDb, {
    provider: "sqlite",
  }),
});
