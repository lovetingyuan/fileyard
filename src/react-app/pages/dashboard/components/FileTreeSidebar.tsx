import { useEffect, useRef, useState } from 'react'
import MdiAlertCircleOutline from '~icons/mdi/alert-circle-outline'
import MdiChevronDown from '~icons/mdi/chevron-down'
import MdiChevronRight from '~icons/mdi/chevron-right'
import MdiFileTree from '~icons/mdi/file-tree'
import MdiFolder from '~icons/mdi/folder'
import MdiFolderOpen from '~icons/mdi/folder-open'
import MdiLock from '~icons/mdi/lock'
import type { FileEntry, FolderEntry } from '../../../../types'
import { useFileList } from '../../../hooks/useFilesApi'
import { getFileIcon } from '../../../constants/fileIcons'
import { useAppStore } from '../../../store'
import { cn } from '../../../utils/cn'
import { getFolderUnlockTokenFromTokens } from '../../../utils/folderUnlockTokens'
import {
  openFolderPasswordModal,
  requestDashboardFileLocation,
  toggleDashboardTreeSidebar,
} from '../actions'
import { useDashboardPath } from '../hooks/useDashboardPath'
import { getDashboardFolderOpenAction } from '../utils/dashboardFolderNavigation'
import { getDashboardFileParentPath } from '../utils/dashboardFileLocation'
import {
  getDashboardTreeAutoOpenPaths,
  mergeDashboardTreeOpenPaths,
  shouldLoadDashboardTreeFolderChildren,
  toggleDashboardTreeOpenPath,
} from '../utils/fileTreeSidebarState'

const TREE_LEVEL_LOADING_ROW_COUNT = 4

export function scrollCurrentFileTreeRowIntoView(row: HTMLDivElement | null, isCurrent: boolean) {
  if (!isCurrent) {
    return
  }

  row?.scrollIntoView({
    block: 'center',
    inline: 'nearest',
  })
}

type FileTreeLevelProps = {
  currentPath: string
  folderUnlockTokens: Record<string, string>
  isNavigationDisabled: boolean
  onToggleFolder: (path: string) => void
  openPaths: string[]
  path: string
  setPath: (path: string) => void
  isRootLevel?: boolean
}

function getFileTreeLevelClassName(isRootLevel = false) {
  return cn(
    isRootLevel
      ? 'menu menu-md w-[calc(100%-0.5rem)] rounded-box bg-transparent p-1 [&_li_ul]:ms-2'
      : 'w-[calc(100%-0.5rem)]',
    'max-w-full min-w-0 overflow-hidden',
  )
}

function FileTreeLoadingRows({ isRootLevel = false }: { isRootLevel?: boolean }) {
  return (
    <ul className={getFileTreeLevelClassName(isRootLevel)} aria-busy="true">
      {Array.from({ length: TREE_LEVEL_LOADING_ROW_COUNT }, (_, index) => (
        <li key={index} className="w-full max-w-full min-w-0 overflow-hidden">
          <span className="flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden px-2 py-1">
            <span className="skeleton h-4 w-4 shrink-0 rounded-sm" />
            <span className="skeleton h-3 w-28 max-w-[80%]" />
          </span>
        </li>
      ))}
    </ul>
  )
}

function FileTreeErrorRow({
  isRootLevel = false,
  refresh,
}: {
  isRootLevel?: boolean
  refresh: () => Promise<void>
}) {
  return (
    <ul className={getFileTreeLevelClassName(isRootLevel)}>
      <li className="w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex w-full max-w-full min-w-0 items-start gap-2 overflow-hidden rounded-md bg-error/10 px-2 py-2 text-xs text-error">
          <MdiAlertCircleOutline className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">加载失败</span>
          <button
            type="button"
            className="link shrink-0"
            onClick={() => {
              void refresh()
            }}
          >
            重试
          </button>
        </div>
      </li>
    </ul>
  )
}

function FileTreeFolderRow({
  canLoadChildren,
  currentPath,
  folder,
  folderUnlockTokens,
  isNavigationDisabled,
  isOpen,
  onToggleFolder,
  openPaths,
  setPath,
}: Omit<FileTreeLevelProps, 'path'> & {
  canLoadChildren: boolean
  folder: FolderEntry
  isOpen: boolean
}) {
  const isCurrent = currentPath === folder.path
  const FolderIcon = isOpen ? MdiFolderOpen : MdiFolder
  const ChevronIcon = isOpen ? MdiChevronDown : MdiChevronRight
  const rowRef = useRef<HTMLDivElement>(null)
  const isPasswordVerified = Boolean(
    getFolderUnlockTokenFromTokens(folderUnlockTokens, folder.path),
  )
  const openFolder = () => {
    const action = getDashboardFolderOpenAction(folder, folderUnlockTokens)
    if (action.type === 'navigate') {
      setPath(action.path)
      return
    }

    openFolderPasswordModal(action.target)
  }
  const handleFolderClick = () => {
    if (isCurrent && canLoadChildren) {
      onToggleFolder(folder.path)
      return
    }

    openFolder()
  }

  useEffect(() => {
    scrollCurrentFileTreeRowIntoView(rowRef.current, isCurrent)
  }, [isCurrent])

  return (
    <li className="w-full max-w-full min-w-0 overflow-hidden">
      <div
        ref={rowRef}
        className={cn(
          'flex w-full max-w-full min-w-0 items-center gap-1 overflow-hidden rounded-md px-1 py-0.5',
          isCurrent && 'menu-active',
        )}
      >
        <button
          type="button"
          className="btn btn-ghost btn-square btn-xs h-5 min-h-5 w-5 shrink-0"
          aria-expanded={canLoadChildren ? isOpen : false}
          aria-label={
            canLoadChildren
              ? isOpen
                ? `折叠文件夹 ${folder.name}`
                : `展开文件夹 ${folder.name}`
              : `验证后展开文件夹 ${folder.name}`
          }
          onClick={() => {
            if (canLoadChildren) {
              onToggleFolder(folder.path)
              return
            }

            openFolder()
          }}
        >
          <ChevronIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex w-full max-w-full min-w-0 flex-1 items-center gap-2 overflow-hidden bg-transparent px-1 py-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isNavigationDisabled}
          aria-current={isCurrent ? 'page' : undefined}
          title={folder.name}
          onClick={handleFolderClick}
        >
          <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
            <FolderIcon className="h-4 w-4 text-warning" />
            {folder.passwordProtected ? (
              <span
                className={cn(
                  'absolute -right-1 -top-1 grid h-3 w-3 place-items-center rounded-full bg-base-100 shadow-sm ring-1 ring-base-300/70',
                  isPasswordVerified ? 'text-success' : 'text-base-content',
                )}
              >
                <MdiLock className="h-2 w-2" />
              </span>
            ) : null}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
        </button>
      </div>
      {canLoadChildren && isOpen ? (
        <FileTreeLevel
          currentPath={currentPath}
          folderUnlockTokens={folderUnlockTokens}
          isNavigationDisabled={isNavigationDisabled}
          onToggleFolder={onToggleFolder}
          openPaths={openPaths}
          path={folder.path}
          setPath={setPath}
        />
      ) : null}
    </li>
  )
}

function FileTreeFileRow({
  file,
  isNavigationDisabled,
  setPath,
}: {
  file: FileEntry
  isNavigationDisabled: boolean
  setPath: (path: string) => void
}) {
  const fileIcon = getFileIcon(file.name)

  return (
    <li className="w-full max-w-full min-w-0 overflow-hidden">
      <button
        type="button"
        className="flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 py-1 text-left hover:bg-base-300/70 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isNavigationDisabled}
        data-dashboard-file-path={file.path}
        title={file.name}
        onClick={() => {
          requestDashboardFileLocation(file.path)
          setPath(getDashboardFileParentPath(file.path))
        }}
      >
        <fileIcon.Icon className={cn('h-4 w-4 shrink-0', fileIcon.color)} />
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
      </button>
    </li>
  )
}

function FileTreeLevel({
  currentPath,
  folderUnlockTokens,
  isNavigationDisabled,
  isRootLevel = false,
  onToggleFolder,
  openPaths,
  path,
  setPath,
}: FileTreeLevelProps) {
  const { dashboardSortKey, dashboardSortOrder } = useAppStore()
  const { data, error, isLoading, refresh } = useFileList(
    path,
    dashboardSortKey,
    dashboardSortOrder,
  )
  const isDirectoryEmpty = !isRootLevel && data.folders.length === 0 && data.files.length === 0

  if (isLoading) {
    return <FileTreeLoadingRows isRootLevel={isRootLevel} />
  }

  if (error) {
    return <FileTreeErrorRow isRootLevel={isRootLevel} refresh={refresh} />
  }

  return (
    <ul className={getFileTreeLevelClassName(isRootLevel)} aria-busy="false">
      {isDirectoryEmpty ? (
        <li className="w-full max-w-full min-w-0 overflow-hidden">
          <div className="w-full my-2 max-w-full min-w-0 truncate px-2 py-1 text-xs text-base-content/50">
            目录为空
          </div>
        </li>
      ) : null}
      {data.folders.map(folder => {
        const canLoadChildren = shouldLoadDashboardTreeFolderChildren(folder, folderUnlockTokens)
        const isOpen = canLoadChildren && openPaths.includes(folder.path)
        return (
          <FileTreeFolderRow
            key={`folder:${folder.path}`}
            canLoadChildren={canLoadChildren}
            currentPath={currentPath}
            folderUnlockTokens={folderUnlockTokens}
            folder={folder}
            isNavigationDisabled={isNavigationDisabled}
            isOpen={isOpen}
            onToggleFolder={onToggleFolder}
            openPaths={openPaths}
            setPath={setPath}
          />
        )
      })}
      {data.files.map(file => (
        <FileTreeFileRow
          key={`file:${file.path}`}
          file={file}
          isNavigationDisabled={isNavigationDisabled}
          setPath={setPath}
        />
      ))}
    </ul>
  )
}

export function FileTreeSidebar() {
  const { folderUnlockTokens, isDashboardTreeSidebarOpen, selectedDashboardTargets } = useAppStore()
  const { currentPath, setPath } = useDashboardPath()
  const [openPaths, setOpenPaths] = useState(() => getDashboardTreeAutoOpenPaths(currentPath))
  const isNavigationDisabled = selectedDashboardTargets.length > 0
  const isRootCurrent = currentPath === ''

  useEffect(() => {
    if (!isDashboardTreeSidebarOpen) {
      return
    }

    setOpenPaths(paths =>
      mergeDashboardTreeOpenPaths(paths, getDashboardTreeAutoOpenPaths(currentPath)),
    )
  }, [currentPath, isDashboardTreeSidebarOpen])

  const handleToggleFolder = (path: string) => {
    setOpenPaths(paths => toggleDashboardTreeOpenPath(paths, path))
  }

  return (
    <aside
      className={cn(
        'absolute inset-y-0 left-0 z-[110] h-full min-h-0 shrink-0 transition-[width] duration-200 ease-in-out md:relative md:inset-auto md:z-10',
        isDashboardTreeSidebarOpen
          ? 'w-72 max-w-[calc(100vw-1rem)] overflow-hidden border-r border-base-300/70 bg-base-100/95 shadow-xl md:max-w-none md:bg-base-100/85 md:shadow-none'
          : 'pointer-events-none w-0 overflow-visible',
      )}
      aria-label="Home 文件树侧栏"
    >
      <div className={cn('flex h-full min-h-0 flex-col', !isDashboardTreeSidebarOpen && 'w-12')}>
        <div
          className={cn(
            'flex h-13 shrink-0 items-center gap-2',
            isDashboardTreeSidebarOpen ? 'px-2' : 'justify-center',
          )}
        >
          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm pointer-events-auto shrink-0"
            aria-expanded={isDashboardTreeSidebarOpen}
            aria-label={isDashboardTreeSidebarOpen ? '折叠 Home 文件树' : '展开 Home 文件树'}
            title={isDashboardTreeSidebarOpen ? '折叠 Home 文件树' : '展开 Home 文件树'}
            onClick={toggleDashboardTreeSidebar}
          >
            <MdiFileTree className="h-5 w-5" />
          </button>
          {isDashboardTreeSidebarOpen ? (
            <button
              type="button"
              className={cn(
                'flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-md px-2 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50',
                isRootCurrent
                  ? 'bg-primary text-primary-content hover:bg-primary/90'
                  : 'hover:bg-base-200',
              )}
              disabled={isNavigationDisabled}
              aria-current={isRootCurrent ? 'page' : undefined}
              title="Home"
              onClick={() => setPath('')}
            >
              <MdiFolderOpen
                className={cn(
                  'h-4 w-4 shrink-0',
                  isRootCurrent ? 'text-primary-content' : 'text-primary',
                )}
              />
              <span className="min-w-0 flex-1 truncate">Home</span>
            </button>
          ) : null}
        </div>

        {isDashboardTreeSidebarOpen ? (
          <nav
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3"
            aria-label="Home 文件树"
          >
            <FileTreeLevel
              currentPath={currentPath}
              folderUnlockTokens={folderUnlockTokens}
              isNavigationDisabled={isNavigationDisabled}
              isRootLevel
              onToggleFolder={handleToggleFolder}
              openPaths={openPaths}
              path=""
              setPath={setPath}
            />
          </nav>
        ) : null}
      </div>
    </aside>
  )
}
