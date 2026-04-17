import type { AppBindings } from "../context";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function parseAdminUserEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(/[,\n;]/)
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

export async function isAdminUser(
  env: Pick<AppBindings, "FILE_YARD_KV">,
  email: string,
): Promise<boolean> {
  const raw = await env.FILE_YARD_KV.get("admin_emails");
  return parseAdminUserEmails(raw ?? "").has(normalizeEmail(email));
}
