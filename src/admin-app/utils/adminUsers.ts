const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

export function readAdminUsersSearchParams(search: string) {
  const params = new URLSearchParams(search);
  const page = parsePositiveInteger(params.get("page"), DEFAULT_PAGE);
  const pageSize = Math.min(
    parsePositiveInteger(params.get("pageSize"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );

  return {
    page,
    pageSize,
  };
}

export function buildAdminUsersApiUrl(page: number, pageSize: number): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return `/api/admin/users?${params.toString()}`;
}

export function buildAdminUsersPageHref(
  page: number,
  pageSize: number,
  basePath = "/admin/users/",
): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return `${basePath}?${params.toString()}`;
}

export function formatAdminDateTime(value: string | null): string {
  if (!value) {
    return "从未登录";
  }

  const [datePart = value, timePart = ""] = value.split("T");
  const normalizedTime = timePart.replace(/\.\d{3}Z$/, "").replace("Z", "");
  return `${datePart} ${normalizedTime} UTC`;
}
