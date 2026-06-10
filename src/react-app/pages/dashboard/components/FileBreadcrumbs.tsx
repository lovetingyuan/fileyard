import clsx from "clsx/lite";
import MdiChevronRight from "~icons/mdi/chevron-right";
import MdiHomeOutline from "~icons/mdi/home-outline";
import MdiInformationOutline from "~icons/mdi/information-outline";
import { openDirectoryStats } from "../actions";
import { useDashboardPath } from "../hooks/useDashboardPath";
import { getBreadcrumbButtonClassName } from "./fileBreadcrumbsClasses";

type FileBreadcrumbsProps = {
  isCurrentPathMissing?: boolean;
  isNavigationDisabled?: boolean;
};

export function FileBreadcrumbs({
  isCurrentPathMissing = false,
  isNavigationDisabled = false,
}: FileBreadcrumbsProps) {
  const { breadcrumbs, currentPath, setPath } = useDashboardPath();
  const isActionDisabled = isCurrentPathMissing || isNavigationDisabled;
  const isRootPath = breadcrumbs.length === 0;

  return (
    <nav className="min-w-0 max-w-full flex-1 basis-[max-content]" aria-label="文件路径">
      <ol className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        <li className="flex min-w-0 items-center">
          <button
            type="button"
            className={clsx(
              isRootPath ? "text-base-content" : getBreadcrumbButtonClassName(isNavigationDisabled),
              "inline-flex items-center gap-1",
            )}
            disabled={isNavigationDisabled}
            onClick={() => setPath("")}
          >
            <MdiHomeOutline className="w-5 h-5" />
            Home
          </button>
        </li>
        {breadcrumbs.map((segment, index) => {
          const path = breadcrumbs.slice(0, index + 1).join("/");
          const isCurrentSegment = index === breadcrumbs.length - 1;

          return (
            <li key={path} className="flex min-w-0 items-center gap-2">
              <MdiChevronRight className="h-4 w-4 shrink-0 text-base-content/35" />
              {isCurrentSegment ? (
                <span inert className="min-w-0 break-all text-base-content/60">
                  {segment}
                </span>
              ) : (
                <button
                  type="button"
                  className={`${getBreadcrumbButtonClassName(
                    isNavigationDisabled,
                  )} min-w-0 break-all text-left`}
                  disabled={isNavigationDisabled}
                  onClick={() => setPath(path)}
                >
                  {segment}
                </button>
              )}
            </li>
          );
        })}
        <li className="flex shrink-0 items-center">
          <div
            className={isActionDisabled ? "shrink-0" : "tooltip shrink-0"}
            data-tip={isActionDisabled ? undefined : "查看当前文件夹详情"}
          >
            <button
              type="button"
              className="btn btn-ghost btn-square btn-xs"
              disabled={isActionDisabled}
              onClick={() => openDirectoryStats(currentPath)}
              aria-label="查看当前文件夹详情"
            >
              <MdiInformationOutline className="w-4 h-4" />
            </button>
          </div>
        </li>
      </ol>
    </nav>
  );
}
