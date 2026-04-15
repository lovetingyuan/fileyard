import { Icon } from "@iconify/react";
import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base-200 px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_bottom_right,_color-mix(in_oklab,var(--color-accent)_16%,transparent),transparent_28%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-8rem] top-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-[-6rem] h-64 w-64 rounded-full bg-accent/10 blur-3xl"
      />

      <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-base-content/10 bg-base-100/92 p-8 text-center shadow-2xl shadow-base-content/5 backdrop-blur sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Icon icon="mdi:compass-off-outline" className="h-8 w-8" />
        </div>
        <p className="text-3xl font-semibold uppercase tracking-[0.4em] text-primary/70">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-base-content">页面不存在</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-base-content/70 sm:text-base">
          你访问的页面可能已经被移动、删除，或者当前链接输入有误。
        </p>

        <div className="mt-8 flex justify-center">
          <Link to="/" className="btn btn-primary gap-2 px-6">
            <Icon icon="mdi:arrow-left" className="h-5 w-5" />
            返回主页
          </Link>
        </div>
      </section>
    </main>
  );
}
