import type { AdminUserListItem } from "../../types";
import { buildAdminUsersPageHref, formatAdminDateTime } from "../utils/adminUsers";

export type AdminUsersPageViewProps = {
  errorKind?: "forbidden" | "other" | "unauthorized";
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  state: "error" | "loading" | "ready";
  total: number;
};

function StatusCard({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-6 py-16">
      <div className="w-full rounded-[2rem] border border-base-300/70 bg-base-100/95 p-8 shadow-xl shadow-base-content/5 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold text-base-content">{title}</h1>
        <p className="mt-4 text-base leading-7 text-base-content/70">{description}</p>
        {actionHref && actionLabel ? (
          <a href={actionHref} className="btn btn-primary mt-8">
            {actionLabel}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function Pagination({
  page,
  pageSize,
  total,
}: Pick<AdminUsersPageViewProps, "page" | "pageSize" | "total">) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-base-300/70 pt-4 text-sm text-base-content/70 sm:flex-row sm:items-center sm:justify-between">
      <p>
        第 <span className="font-semibold text-base-content">{page}</span> / {totalPages} 页，共{" "}
        {total} 位用户
      </p>
      <div className="join self-start sm:self-auto">
        {hasPrevious ? (
          <a
            href={buildAdminUsersPageHref(page - 1, pageSize)}
            className="btn join-item btn-sm btn-outline"
          >
            上一页
          </a>
        ) : (
          <span className="btn join-item btn-sm btn-disabled">上一页</span>
        )}
        {hasNext ? (
          <a
            href={buildAdminUsersPageHref(page + 1, pageSize)}
            className="btn join-item btn-sm btn-outline"
          >
            下一页
          </a>
        ) : (
          <span className="btn join-item btn-sm btn-disabled">下一页</span>
        )}
      </div>
    </div>
  );
}

export function AdminUsersPageView({
  errorKind,
  items,
  page,
  pageSize,
  state,
  total,
}: AdminUsersPageViewProps) {
  if (state === "loading") {
    return <StatusCard title="正在加载用户列表" description="后台正在读取用户数据，请稍候。" />;
  }

  if (state === "error" && errorKind === "unauthorized") {
    return (
      <StatusCard
        title="请先登录"
        description="登录后才能查看后台用户管理页面。"
        actionHref="/login"
        actionLabel="前往登录"
      />
    );
  }

  if (state === "error" && errorKind === "forbidden") {
    return <StatusCard title="你没有管理员权限" description="当前账号没有访问后台系统的权限。" />;
  }

  if (state === "error") {
    return <StatusCard title="加载失败" description="用户列表暂时不可用，请稍后重试。" />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-base-300/70 bg-base-100/95 p-6 shadow-xl shadow-base-content/5 backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 border-b border-base-300/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-base-content">用户管理</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-base-content/70">
              只读查看所有用户的邮箱、注册时间和最近登录时间。
            </p>
          </div>
          <a href="/" className="btn btn-ghost self-start sm:self-auto">
            返回应用
          </a>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-xl font-semibold text-base-content">暂无用户</h2>
            <p className="mt-3 text-sm text-base-content/70">
              当前数据库中还没有可展示的用户记录。
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-hidden rounded-2xl border border-base-300/70">
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>邮箱</th>
                      <th>注册时间</th>
                      <th>最近登录时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.email}>
                        <td className="font-medium text-base-content">{item.email}</td>
                        <td className="whitespace-nowrap text-base-content/70">
                          {formatAdminDateTime(item.createdAt)}
                        </td>
                        <td className="whitespace-nowrap text-base-content/70">
                          {formatAdminDateTime(item.lastLoginAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} />
          </>
        )}
      </section>
    </main>
  );
}
