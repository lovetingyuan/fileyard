import type { AppBindings } from "../context";

type ResendPayload = {
  html: string;
  subject: string;
  to: string;
};

type AuthEmailPayload = {
  token: string;
  url: string;
  user: {
    email: string;
    name?: string | null;
  };
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAuthEmailHtml(options: {
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  footnote: string;
}): string {
  const { title, description, actionLabel, actionUrl, footnote } = options;
  const safeUrl = escapeHtml(actionUrl);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #f8fafc; border-radius: 16px; padding: 32px;">
        <h1 style="color: #2563eb; margin-bottom: 16px;">${escapeHtml(title)}</h1>
        <p style="font-size: 16px; margin-bottom: 20px;">${escapeHtml(description)}</p>
        <p style="margin-bottom: 20px;">
          <a href="${safeUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 22px; text-decoration: none; border-radius: 999px; font-weight: 600;">
            ${escapeHtml(actionLabel)}
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px; word-break: break-all;">
          ${safeUrl}
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px;">${escapeHtml(footnote)}</p>
      </div>
    </body>
    </html>
  `;
}

async function sendResendEmail(env: AppBindings, payload: ResendPayload): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  const senderEmail = env.SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    throw new Error("Resend email delivery is not fully configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: senderEmail,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to send email via Resend: ${body}`);
  }
}

export function createVerificationEmailSender(env: AppBindings) {
  return async (payload: AuthEmailPayload): Promise<void> => {
    await sendResendEmail(env, {
      to: payload.user.email,
      subject: "Verify your email address",
      html: buildAuthEmailHtml({
        title: "Verify Your Email",
        description:
          "Please confirm your email address to finish setting up your File Share account.",
        actionLabel: "Verify Email",
        actionUrl: payload.url,
        footnote: "If you did not create this account, you can safely ignore this email.",
      }),
    });
  };
}

export function createResetPasswordEmailSender(env: AppBindings) {
  return async (payload: AuthEmailPayload): Promise<void> => {
    await sendResendEmail(env, {
      to: payload.user.email,
      subject: "Reset your password",
      html: buildAuthEmailHtml({
        title: "Reset Your Password",
        description:
          "We received a request to reset your password. Use the button below to choose a new one.",
        actionLabel: "Reset Password",
        actionUrl: payload.url,
        footnote: "If you did not request a password reset, you can safely ignore this email.",
      }),
    });
  };
}
