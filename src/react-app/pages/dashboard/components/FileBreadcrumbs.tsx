import MdiHomeOutline from '~icons/mdi/home-outline'
import MdiInformationOutline from '~icons/mdi/information-outline'
import { openDirectoryStats } from '../actions'
import { useDashboardPath } from '../hooks/useDashboardPath'

export function FileBreadcrumbs() {
  const { breadcrumbs, currentPath, setPath } = useDashboardPath()

  return (
    <>
      <div className="max-w-full shrink-0 overflow-x-auto breadcrumbs text-sm">
        <ul>
          <li>
            <button
              type="button"
              className="link link-hover inline-flex items-center gap-1"
              onClick={() => setPath('')}
            >
              <MdiHomeOutline className="w-5 h-5" />
              Home
            </button>
          </li>
          {breadcrumbs.map((segment, index) => {
            const path = breadcrumbs.slice(0, index + 1).join('/')
            const isCurrentSegment = index === breadcrumbs.length - 1

            return (
              <li key={path}>
                {isCurrentSegment ? (
                  <span inert className="text-base-content/60">
                    {segment}
                  </span>
                ) : (
                  <button type="button" className="link link-hover" onClick={() => setPath(path)}>
                    {segment}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="tooltip shrink-0" data-tip="查看当前文件夹详情">
        <button
          type="button"
          className="btn btn-ghost btn-square btn-xs"
          onClick={() => openDirectoryStats(currentPath)}
          aria-label="查看当前文件夹详情"
        >
          <MdiInformationOutline className="w-4 h-4" />
        </button>
      </div>
    </>
  )
}
