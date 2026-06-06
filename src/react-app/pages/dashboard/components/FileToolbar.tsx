import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import MdiChevronDown from '~icons/mdi/chevron-down'
import MdiClipboardFileOutline from '~icons/mdi/clipboard-file-outline'
import MdiClose from '~icons/mdi/close'
import MdiFileUpload from '~icons/mdi/file-upload'
import MdiFilePlus from '~icons/mdi/file-plus'
import MdiFolderPlus from '~icons/mdi/folder-plus'
import MdiFolderUpload from '~icons/mdi/folder-upload'
import MdiMagnify from '~icons/mdi/magnify'
import MdiRefresh from '~icons/mdi/refresh'
import MdiViewGrid from '~icons/mdi/view-grid'
import MdiViewList from '~icons/mdi/view-list'
import { Dropdown } from '../../../components/Dropdown'
import { useAppStore } from '../../../store'
import { takeFileInputSelection } from '../../../utils/uploadInputSelection'
import {
  openNewTextFile,
  setDashboardSearchInput,
  setUploadType,
  startCreateFolder,
  toggleDashboardLayoutMode,
} from '../actions'
import { useDashboardFileView } from '../hooks/useDashboardFileView'
import { uploadDashboardFiles } from '../uploadFiles'
import { useClipboardUploadDialog } from './ClipboardUploadButton'
import { BatchSelectionToolbar } from './BatchSelectionToolbar'
import { FileBreadcrumbs } from './FileBreadcrumbs'
import { FileSortMenu } from './FileSortMenu'

function LayoutToggleButton() {
  const { dashboardLayoutMode } = useAppStore()
  const isGridLayout = dashboardLayoutMode === 'grid'
  const ToggleIcon = isGridLayout ? MdiViewList : MdiViewGrid
  const tooltip = isGridLayout ? '切换到表格布局' : '切换到网格布局'

  return (
    <div className="tooltip" data-tip={tooltip}>
      <button
        type="button"
        className="btn btn-ghost btn-square btn-sm"
        aria-label={tooltip}
        aria-pressed={isGridLayout}
        onClick={toggleDashboardLayoutMode}
      >
        <ToggleIcon className="h-5 w-5" />
      </button>
    </div>
  )
}

type FileToolbarProps = {
  isCurrentPathMissing?: boolean
}

export type FileToolbarHandle = {
  focusSearchInput: () => void
}

export const FileToolbar = forwardRef<FileToolbarHandle, FileToolbarProps>(function FileToolbar(
  { isCurrentPathMissing = false },
  ref,
) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const { getUniqueFolderName, isRefreshing, refresh, searchInputValue } = useDashboardFileView()
  const {
    creatingFolder,
    isCreatingNewFolder,
    movingPath,
    renamingPath,
    savingTextFile,
    selectedDashboardTargets,
  } = useAppStore()
  const isBatchSelectionActive = selectedDashboardTargets.length > 0
  const isSearchExpanded = searchInputValue.length > 0
  const isFileMutationDisabled = Boolean(renamingPath || movingPath)
  const { clipboardUploadDialog, openClipboardUploadDialog } = useClipboardUploadDialog({
    isFileMutationDisabled,
  })

  const folderInputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    folderInputRef.current = node
    if (node) {
      node.setAttribute('webkitdirectory', '')
      node.setAttribute('directory', '')
    }
  }, [])

  const handleUploadSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
    source: 'file' | 'folder',
  ) => {
    const files = takeFileInputSelection(event.target)
    void uploadDashboardFiles({ files, source, isFileMutationDisabled })
  }

  const focusSearchInput = useCallback(() => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
  }, [])

  useImperativeHandle(ref, () => ({ focusSearchInput }), [focusSearchInput])

  const clearSearchInput = () => {
    setDashboardSearchInput('')
    focusSearchInput()
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-5">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={event => handleUploadSelection(event, 'file')}
      />
      <input
        ref={folderInputCallbackRef}
        type="file"
        className="hidden"
        onChange={event => handleUploadSelection(event, 'folder')}
      />

      <FileBreadcrumbs
        isCurrentPathMissing={isCurrentPathMissing}
        isNavigationDisabled={isBatchSelectionActive}
      />

      {!isCurrentPathMissing && isBatchSelectionActive ? <BatchSelectionToolbar /> : null}

      {!isCurrentPathMissing && !isBatchSelectionActive ? (
        <div className="ml-auto flex w-max max-w-full min-w-0 flex-wrap items-center justify-end gap-3 sm:gap-4">
          <Dropdown
            containerClassName="shrink-0"
            trigger={
              <>
                <MdiFileUpload className="h-4 w-4" />
                上传
                <MdiChevronDown className="h-4 w-4 opacity-70" />
              </>
            }
            triggerClassName="btn btn-sm border-emerald-500 bg-emerald-500 px-3 text-white hover:border-emerald-600 hover:bg-emerald-600 focus-visible:outline-emerald-500 disabled:border-emerald-300 disabled:bg-emerald-300"
            triggerAriaLabel="上传"
            disabled={isFileMutationDisabled}
            placement="bottom-end"
            contentClassName="menu menu-md bg-base-200 rounded-box z-20 mt-1 w-44 border border-base-300/60 p-2 shadow-lg space-y-1"
          >
            <li>
              <button
                type="button"
                className="gap-2"
                onClick={() => {
                  setUploadType('file')
                  fileInputRef.current?.click()
                }}
                disabled={isFileMutationDisabled}
                aria-label="上传文件"
              >
                <MdiFileUpload className="h-4 w-4 text-emerald-500" />
                上传文件
              </button>
            </li>
            <li>
              <button
                type="button"
                className="gap-2"
                onClick={() => {
                  setUploadType('folder')
                  folderInputRef.current?.click()
                }}
                disabled={isFileMutationDisabled}
                aria-label="上传文件夹"
              >
                <MdiFolderUpload className="h-4 w-4 text-green-500" />
                上传文件夹
              </button>
            </li>
            <li>
              <button
                type="button"
                className="gap-2"
                onClick={openClipboardUploadDialog}
                disabled={isFileMutationDisabled}
                aria-label="上传粘贴板"
              >
                <MdiClipboardFileOutline className="h-4 w-4 text-sky-500" />
                上传粘贴板
              </button>
            </li>
          </Dropdown>
          <Dropdown
            containerClassName="shrink-0"
            trigger={
              <>
                <MdiFilePlus className="h-4 w-4" />
                新建
                <MdiChevronDown className="h-4 w-4 opacity-70" />
              </>
            }
            triggerClassName="btn btn-accent btn-sm px-3"
            triggerAriaLabel="新建"
            disabled={isFileMutationDisabled}
            placement="bottom-end"
            contentClassName="menu menu-md bg-base-200 rounded-box z-20 mt-1 w-44 border border-base-300/60 p-2 shadow-lg space-y-1"
          >
            <li>
              <button
                type="button"
                className="gap-2"
                disabled={savingTextFile || isFileMutationDisabled}
                onClick={openNewTextFile}
                aria-label="新建文本文件"
              >
                <MdiFilePlus className="h-4 w-4 text-accent" />
                新建文本文件
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`gap-2 ${creatingFolder ? 'loading' : ''}`}
                disabled={creatingFolder || isCreatingNewFolder || isFileMutationDisabled}
                onClick={() => startCreateFolder(getUniqueFolderName('新建文件夹'))}
                aria-label="新建文件夹"
              >
                {!creatingFolder && <MdiFolderPlus className="h-4 w-4 text-secondary" />}
                新建文件夹
              </button>
            </li>
          </Dropdown>
          <LayoutToggleButton />
          <FileSortMenu />
          <div
            className={`group/search relative h-8 max-w-full min-w-0 shrink-0 transition-[width] duration-200 ease-in-out focus-within:order-last focus-within:basis-full focus-within:w-full sm:focus-within:order-0 sm:focus-within:basis-auto sm:focus-within:w-52 ${
              isSearchExpanded
                ? 'order-last basis-full w-full sm:order-0 sm:basis-auto sm:w-52'
                : 'basis-8 w-8'
            }`}
          >
            <div className="absolute inset-0 overflow-hidden rounded-field">
              <input
                ref={searchInputRef}
                type="text"
                className={`placeholder:text-[12px] input input-sm input-bordered absolute top-0 right-0 h-8 w-full min-w-0 transition-opacity duration-150 ease-in-out sm:w-52 group-focus-within/search:border-base-300 group-focus-within/search:bg-base-100 group-focus-within/search:opacity-100 group-focus-within/search:outline-none ${
                  isSearchExpanded
                    ? 'border-base-300 bg-base-100 pr-9 opacity-100'
                    : 'border-transparent bg-transparent pr-9 opacity-0'
                }`}
                placeholder="Search current folder"
                value={searchInputValue}
                onChange={event => setDashboardSearchInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    setDashboardSearchInput('')
                    event.currentTarget.blur()
                  }
                }}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-field transition-shadow duration-150 ease-in-out group-focus-within/search:ring-2 group-focus-within/search:ring-base-content/15" />
            <div className="tooltip absolute inset-y-0 right-0 z-10" data-tip="Search">
              <button
                type="button"
                className={`btn btn-ghost btn-square btn-sm h-8 w-8 transition-opacity duration-150 ease-in-out group-focus-within/search:pointer-events-none group-focus-within/search:opacity-0 ${
                  isSearchExpanded ? 'pointer-events-none opacity-0' : ''
                }`}
                onMouseDown={event => event.preventDefault()}
                onClick={focusSearchInput}
                aria-label="搜索文件"
              >
                <MdiMagnify className="w-5 h-5" />
              </button>
            </div>
            {isSearchExpanded && (
              <button
                type="button"
                className="btn btn-ghost btn-square btn-xs absolute inset-y-0 right-1 z-10 my-auto h-6 min-h-6 w-6 text-base-content/50 hover:text-base-content"
                onMouseDown={event => event.preventDefault()}
                onClick={clearSearchInput}
                aria-label="清空搜索"
              >
                <MdiClose className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="tooltip shrink-0" data-tip="Refresh">
            <button
              type="button"
              className={`btn btn-ghost btn-square btn-sm ${isRefreshing ? 'loading w-8 scale-75' : ''}`}
              disabled={isRefreshing}
              onClick={() => void refresh()}
              aria-label="刷新文件列表"
            >
              {!isRefreshing && <MdiRefresh className="w-5 h-5" />}
            </button>
          </div>
          {clipboardUploadDialog}
        </div>
      ) : null}
    </div>
  )
})
