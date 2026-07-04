import type { AppBindings } from "../context";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseAdminUserEmails(value: string | undefined): Set<string> {
  const emails = new Set<string>();
  for (const item of (value ?? "").split(/[,\n;]/)) {
    const email = normalizeEmail(item);
    if (email) {
      emails.add(email);
    }
  }
  return emails;
}

export async function isAdminUser(
  env: Pick<AppBindings, "FILE_YARD_KV">,
  email: string,
): Promise<boolean> {
  const raw = await env.FILE_YARD_KV.get("admin_emails");
  return parseAdminUserEmails(raw ?? "").has(normalizeEmail(email));
}
