import { useLocation, useSearchParams } from "react-router-dom";
import { ApiError } from "../utils/apiRequest";
import { useAdminUsers } from "../hooks/useAdminUsers";
import { buildAdminLoginHref } from "../utils/adminRoutes";
import { readAdminUsersSearchParams } from "../utils/adminUsers";
import { AdminUsersPageView } from "../components/AdminUsersPageView";

function toErrorKind(
  error: ApiError | undefined,
): "forbidden" | "other" | "unauthorized" | undefined {
  if (!error) {
    return undefined;
  }
  if (error.status === 401) {
    return "unauthorized";
  }
  if (error.status === 403) {
    return "forbidden";
  }
  return "other";
}

export function AdminUsersPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const { page, pageSize } = readAdminUsersSearchParams(search ? `?${search}` : "");
  const { data, error, isLoading } = useAdminUsers(page, pageSize);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_color-mix(in_oklab,var(--color-primary)_20%,transparent),transparent_32%),linear-gradient(180deg,color-mix(in_oklab,var(--color-base-200)_90%,white),var(--color-base-200))]">
      <AdminUsersPageView
        items={data?.items ?? []}
        page={data?.page ?? page}
        pageSize={data?.pageSize ?? pageSize}
        total={data?.total ?? 0}
        state={isLoading ? "loading" : error ? "error" : "ready"}
        errorKind={toErrorKind(error)}
        loginHref={buildAdminLoginHref(`${location.pathname}${location.search}`)}
      />
    </div>
  );
}
