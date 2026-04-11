/**
 * Email utilities using Resend API
 */

/**
 * Encode email and token into a single opaque verification code.
 * Format: base64url(email + ":" + token)
 * This avoids exposing the email as a plain query parameter in the URL.
 */
export function encodeVerificationCode(email: string, token: string): string {
  const raw = `${email}:${token}`;
  const encoded = btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
  return encoded;
}

/**
 * Decode a verification code back into email and token.
 * Returns null if the code is malformed.
 */
export function decodeVerificationCode(code: string): { email: string; token: string } | null {
  try {
    const padding = code.length % 4 === 0 ? "" : "=".repeat(4 - (code.length % 4));
    const normalized = code.replace(/-/g, "+").replace(/_/g, "/") + padding;
    const raw = atob(normalized);
    const separatorIndex = raw.indexOf(":");
    if (separatorIndex === -1) {
      return null;
    }
    const email = raw.slice(0, separatorIndex);
    const token = raw.slice(separatorIndex + 1);
    if (!email || !token) {
      return null;
    }
    return { email, token };
  } catch {
    return null;
  }
}

interface AuthEmailOptions {
  to: string;
  token: string;
  appUrl: string;
}

function buildAuthEmailHtml(options: {
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  footnote: string;
}): string {
  const { title, description, actionLabel, actionUrl, footnote } = options;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f9f9f9; border-radius: 10px; padding: 30px; margin-top: 20px;">
        <h1 style="color: #2563eb; margin-bottom: 20px;">${title}</h1>
        <p style="font-size: 16px; margin-bottom: 20px;">
          ${description}
        </p>
        <p style="margin-bottom: 20px;">
          <a href="${actionUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            ${actionLabel}
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${actionUrl}" style="color: #2563eb; word-break: break-all;">${actionUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          ${footnote}
        </p>
      </div>
    </body>
    </html>
  `;
}

async function sendAuthEmail(
  options: AuthEmailOptions & {
    subject: string;
    title: string;
    description: string;
    actionLabel: string;
    path: string;
    footnote: string;
    failureMessage: string;
  },
  resendApiKey: string,
  senderEmail: string,
): Promise<{ success: boolean; error?: string; status: number }> {
  const {
    to,
    token,
    appUrl,
    subject,
    title,
    description,
    actionLabel,
    path,
    footnote,
    failureMessage,
  } = options;
  const code = encodeVerificationCode(to, token);
  const actionUrl = `${appUrl}${path}/${code}`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: senderEmail,
        to: [to],
        subject,
        html: buildAuthEmailHtml({
          title,
          description,
          actionLabel,
          actionUrl,
          footnote,
        }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return { success: false, error: failureMessage, status: 502 };
    }

    return { success: true, status: 200 };
  } catch (error) {
    console.error("Resend request failed:", error);
    return { success: false, error: failureMessage, status: 502 };
  }
}

/**
 * Send verification email via Resend API
 */
export async function sendVerificationEmail(
  options: AuthEmailOptions,
  resendApiKey: string,
  senderEmail: string,
): Promise<{ success: boolean; error?: string; status: number }> {
  return sendAuthEmail(
    {
      ...options,
      subject: "Verify your email address",
      title: "Verify Your Email",
      description:
        "Thank you for registering! Please click the button below to verify your email address.",
      actionLabel: "Verify Email",
      path: "/verify",
      footnote:
        "This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.",
      failureMessage: "Failed to send verification email",
    },
    resendApiKey,
    senderEmail,
  );
}

/**
 * Send password reset email via Resend API
 */
export async function sendPasswordResetEmail(
  options: AuthEmailOptions,
  resendApiKey: string,
  senderEmail: string,
): Promise<{ success: boolean; error?: string; status: number }> {
  return sendAuthEmail(
    {
      ...options,
      subject: "Reset your password",
      title: "Reset Your Password",
      description:
        "We received a request to reset your password. Use the link below to choose a new password.",
      actionLabel: "Reset Password",
      path: "/reset-password",
      footnote:
        "This link will expire in 24 hours. If you did not request a password reset, you can safely ignore this email.",
      failureMessage: "Failed to send password reset email",
    },
    resendApiKey,
    senderEmail,
  );
}
