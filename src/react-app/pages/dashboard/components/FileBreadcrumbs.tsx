import MdiChevronRight from "~icons/mdi/chevron-right";
import MdiHomeOutline from "~icons/mdi/home-outline";
import MdiInformationOutline from "~icons/mdi/information-outline";
import MdiLock from "~icons/mdi/lock";
import MdiLockOpenVariant from "~icons/mdi/lock-open-variant";
import { useAppStore } from "../../../store";
import { cn } from "../../../utils/cn";
import { openDirectoryStats } from "../actions";
import { useDashboardPath } from "../hooks/useDashboardPath";
import { getBreadcrumbButtonClassName } from "./fileBreadcrumbsClasses";

type FileBreadcrumbsProps = {
  isCurrentPathLocked?: boolean;
  isCurrentPathMissing?: boolean;
  isNavigationDisabled?: boolean;
  lockedProtectedPath?: string | null;
};

function hasExactUnlockToken(folderUnlockTokens: Record<string, string>, path: string) {
  return Object.prototype.hasOwnProperty.call(folderUnlockTokens, path);
}

function BreadcrumbLockIcon({ isPasswordVerified }: { isPasswordVerified: boolean }) {
  const LockIcon = isPasswordVerified ? MdiLockOpenVariant : MdiLock;

  return (
    <LockIcon
      className={cn("h-3 w-3 shrink-0", isPasswordVerified ? "text-success" : "text-base-content/60")}
      aria-hidden="true"
    />
  );
}

export function FileBreadcrumbs({
  isCurrentPathLocked = false,
  isCurrentPathMissing = false,
  isNavigationDisabled = false,
  lockedProtectedPath = null,
}: FileBreadcrumbsProps) {
  const { breadcrumbs, currentPath, setPath } = useDashboardPath();
  const { folderUnlockTokens } = useAppStore();
  const isActionDisabled = isCurrentPathLocked || isCurrentPathMissing || isNavigationDisabled;
  const isRootPath = breadcrumbs.length === 0;

  return (
    <nav className="min-w-0 max-w-full flex-1 basis-[max-content]" aria-label="文件路径">
      <ol className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        <li className="flex min-w-0 items-center">
          <button
            type="button"
            className={cn(
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
          const isPasswordVerified = hasExactUnlockToken(folderUnlockTokens, path);
          const showLock = isPasswordVerified || lockedProtectedPath === path;

          return (
            <li key={path} className="flex min-w-0 items-center gap-2">
              <MdiChevronRight className="h-4 w-4 shrink-0 text-base-content/35" />
              {isCurrentSegment ? (
                <span inert className="inline-flex min-w-0 items-center gap-1 text-base-content/60">
                  <span className="min-w-0 break-all">{segment}</span>
                  {showLock ? <BreadcrumbLockIcon isPasswordVerified={isPasswordVerified} /> : null}
                </span>
              ) : (
                <button
                  type="button"
                  className={cn(
                    getBreadcrumbButtonClassName(isNavigationDisabled),
                    "inline-flex min-w-0 items-center gap-1 text-left",
                  )}
                  disabled={isNavigationDisabled}
                  onClick={() => setPath(path)}
                >
                  <span className="min-w-0 break-all">{segment}</span>
                  {showLock ? <BreadcrumbLockIcon isPasswordVerified={isPasswordVerified} /> : null}
                </button>
              )}
            </li>
          );
        })}
        <li className="flex shrink-0 items-center">
          <div
            className={cn("shrink-0", !isActionDisabled && "tooltip")}
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
