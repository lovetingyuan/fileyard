import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export type BetterAuthSession = typeof authClient.$Infer.Session;
