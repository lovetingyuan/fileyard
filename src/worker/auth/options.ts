import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { deriveAuthNameFromEmail } from "./utils";
import { validatePassword } from "../utils/password";

type AuthEmailPayload = {
  token: string;
  url: string;
  user: {
    email: string;
    name?: string | null;
  };
};

type CreateBetterAuthOptionsInput = {
  appName: string;
  baseURL: string;
  secret: string;
  googleClientId: string;
  googleClientSecret: string;
  trustedOrigins: BetterAuthOptions["trustedOrigins"];
  sendVerificationEmail: (payload: AuthEmailPayload, request?: Request) => Promise<void>;
  sendResetPassword: (payload: AuthEmailPayload, request?: Request) => Promise<void>;
  onUserCreated?: (user: { id: string; email: string }) => Promise<void>;
  backgroundTaskHandler?: ((promise: Promise<unknown>) => void) | undefined;
};

function hasGoogleCredentials(input: CreateBetterAuthOptionsInput): boolean {
  return Boolean(input.googleClientId && input.googleClientSecret);
}

function toBadRequest(message: string): APIError {
  return new APIError("BAD_REQUEST", {
    message,
  });
}

export function createBetterAuthOptions(input: CreateBetterAuthOptionsInput): BetterAuthOptions {
  return {
    appName: input.appName,
    baseURL: input.baseURL,
    basePath: "/api/auth",
    secret: input.secret,
    trustedOrigins: input.trustedOrigins,
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
      },
      ...(input.backgroundTaskHandler
        ? {
            backgroundTasks: {
              handler: input.backgroundTaskHandler,
            },
          }
        : {}),
    },
    rateLimit: {
      storage: "database",
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email") {
          const email = typeof ctx.body.email === "string" ? ctx.body.email : "";
          const password = typeof ctx.body.password === "string" ? ctx.body.password : "";
          const passwordValidation = validatePassword(password);

          if (!passwordValidation.valid) {
            throw toBadRequest(passwordValidation.errors.join(", "));
          }

          return {
            context: {
              body: {
                ...ctx.body,
                email: email.trim().toLowerCase(),
                name: deriveAuthNameFromEmail(email),
              },
            },
          };
        }

        if (ctx.path === "/reset-password") {
          const nextPassword = typeof ctx.body.newPassword === "string" ? ctx.body.newPassword : "";
          const passwordValidation = validatePassword(nextPassword);

          if (!passwordValidation.valid) {
            throw toBadRequest(passwordValidation.errors.join(", "));
          }
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            const normalizedEmail =
              typeof user.email === "string" ? user.email.trim().toLowerCase() : "";

            return {
              data: {
                ...user,
                email: normalizedEmail,
                name:
                  typeof user.name === "string" && user.name.trim().length > 0
                    ? user.name.trim().slice(0, 64)
                    : deriveAuthNameFromEmail(normalizedEmail),
              },
            };
          },
          async after(user) {
            if (!input.onUserCreated || !user?.id || !user.email) {
              return;
            }

            await input.onUserCreated({
              id: user.id,
              email: user.email,
            });
          },
        },
      },
    },
    ...(hasGoogleCredentials(input)
      ? {
          account: {
            accountLinking: {
              enabled: true,
              trustedProviders: ["google"] as const,
            },
          },
          socialProviders: {
            google: {
              clientId: input.googleClientId,
              clientSecret: input.googleClientSecret,
              prompt: "select_account",
            },
          },
        }
      : {}),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 64,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 1800,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: input.sendResetPassword,
    },
    emailVerification: {
      autoSignInAfterVerification: false,
      sendOnSignIn: true,
      sendOnSignUp: true,
      sendVerificationEmail: input.sendVerificationEmail,
    },
  };
}
