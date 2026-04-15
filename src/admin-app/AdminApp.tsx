import { ApiError } from "./utils/apiRequest";
import { useAdminUsers } from "./hooks/useAdminUsers";
import { AdminUsersPageView } from "./components/AdminUsersPageView";

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

type AdminAppProps = {
  page: number;
  pageSize: number;
};

export function AdminApp({ page, pageSize }: AdminAppProps) {
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
      />
    </div>
  );
}
