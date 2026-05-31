import { useCallback, type ComponentType, type SVGProps } from 'react'
import MdiDeleteOutline from '~icons/mdi/delete-outline'
import MdiDotsHorizontal from '~icons/mdi/dots-horizontal'
import MdiDownload from '~icons/mdi/download'
import MdiFolder from '~icons/mdi/folder'
import MdiFolderMoveOutline from '~icons/mdi/folder-move-outline'
import MdiInformationOutline from '~icons/mdi/information-outline'
import MdiPencil from '~icons/mdi/pencil'
import MdiShareVariantOutline from '~icons/mdi/share-variant-outline'
import type { FileEntry, FolderEntry } from '../../../../types'
import { getFileIcon } from '../../../constants/fileIcons'
import { useAppStore } from '../../../store'
import { formatBytes, formatDate, formatDetailedDate } from '../../../utils/fileFormatters'
import {
  openDirectoryStats,
  openFileDetails,
  openFilePreview,
  openFileShare,
  requestDeleteTarget,
  requestMoveTarget,
  requestRenameTarget,
} from '../actions'
import { downloadDashboardFile } from '../fileOperations'
import { useDashboardPath } from '../hooks/useDashboardPath'
import {
  clearDashboardSearchHighlightRanges,
  setDashboardSearchHighlightRanges,
} from '../utils/dashboardSearchHighlight'
import type { SearchMatchRange } from '../utils/searchMatch'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>
type DashboardFolder = FolderEntry & {
  searchMatchRanges?: SearchMatchRange[]
}
type DashboardFile = FileEntry & {
  searchMatchRanges?: SearchMatchRange[]
}

type RowActionItem = {
  label: string
  Icon: IconComponent
  tone?: 'default' | 'danger'
  onClick: () => void
}

function SearchHighlightedName({
  name,
  ranges,
  rowKey,
}: {
  name: string
  ranges: SearchMatchRange[]
  rowKey: string
}) {
  const registerTextNode = useCallback(
    (node: HTMLSpanElement | null) => {
      clearDashboardSearchHighlightRanges(rowKey)

      const textNode = node?.firstChild
      const textLength = textNode?.textContent?.length ?? 0
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE || ranges.length === 0) {
        return
      }

      const highlightRanges = ranges
        .filter(range => range.start >= 0 && range.start < range.end && range.end <= textLength)
        .map(matchRange => {
          const range = new Range()
          range.setStart(textNode, matchRange.start)
          range.setEnd(textNode, matchRange.end)
          return range
        })

      setDashboardSearchHighlightRanges(rowKey, highlightRanges)
    },
    [ranges, rowKey],
  )

  return <span ref={registerTextNode}>{name}</span>
}

function RowActionsMenu({
  isActionDisabled,
  isLoading,
  items,
}: {
  isActionDisabled: boolean
  isLoading?: boolean
  items: RowActionItem[]
}) {
  return (
    <div className="dropdown dropdown-top dropdown-end">
      <button
        type="button"
        tabIndex={0}
        className={`btn btn-ghost btn-xs btn-square sm:btn-sm ${isLoading ? 'loading' : ''}`}
        disabled={isActionDisabled}
        aria-label="更多操作"
      >
        {!isLoading && <MdiDotsHorizontal className="h-4 w-4" />}
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu menu-sm bg-base-200 rounded-box z-10 mt-1 w-40 border border-base-300/60 p-2 shadow-lg space-y-1"
      >
        {items.map(item => (
          <li key={item.label}>
            <button
              type="button"
              className={`gap-2 ${item.tone === 'danger' ? 'text-error' : ''}`}
              onClick={() => {
                ;(document.activeElement as HTMLElement | null)?.blur()
                item.onClick()
              }}
            >
              <item.Icon className="h-4 w-4" />
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FolderRow({ folder }: { folder: DashboardFolder }) {
  const { setPath } = useDashboardPath()
  const { deletingFolderPath, movingPath, renamingPath } = useAppStore()
  const rowKey = `folder:${folder.path}`
  const isLoading =
    deletingFolderPath === folder.path || renamingPath === folder.path || movingPath === folder.path
  const isActionDisabled = Boolean(renamingPath || movingPath) || isLoading

  return (
    <tr>
      <td className="min-w-0">
        <span className="flex w-full min-w-0 items-center gap-1 sm:gap-2 align-middle">
          <MdiFolder className="h-5 w-5 shrink-0 text-warning" />
          <button
            type="button"
            className="block min-w-0 truncate text-left font-bold link link-hover"
            onClick={() => setPath(folder.path)}
          >
            <SearchHighlightedName
              name={folder.name}
              ranges={folder.searchMatchRanges ?? []}
              rowKey={rowKey}
            />
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell select-none">-</td>
      <td className="hidden whitespace-nowrap text-base-content/50 sm:table-cell text-xs select-none">
        {formatDate(folder.createdAt)}
      </td>
      <td className="text-right">
        <RowActionsMenu
          isActionDisabled={isActionDisabled}
          isLoading={isLoading}
          items={[
            {
              label: '重命名',
              Icon: MdiPencil,
              onClick: () =>
                requestRenameTarget({ type: 'folder', path: folder.path, name: folder.name }),
            },
            {
              label: '移动',
              Icon: MdiFolderMoveOutline,
              onClick: () =>
                requestMoveTarget({ type: 'folder', path: folder.path, name: folder.name }),
            },
            {
              label: '删除',
              Icon: MdiDeleteOutline,
              tone: 'danger',
              onClick: () =>
                requestDeleteTarget({ type: 'folder', path: folder.path, name: folder.name }),
            },
            {
              label: '查看详情',
              Icon: MdiInformationOutline,
              onClick: () => openDirectoryStats(folder.path),
            },
          ]}
        />
      </td>
    </tr>
  )
}

export function FileRow({ file }: { file: DashboardFile }) {
  const { deletingFilePath, downloadingPath, movingPath, renamingPath } = useAppStore()
  const fileIcon = getFileIcon(file.name)
  const rowKey = `file:${file.path}`
  const createdAtTooltip = `创建时间：${formatDetailedDate(file.createdAt)}`
  const isLoading =
    deletingFilePath === file.path ||
    downloadingPath === file.path ||
    renamingPath === file.path ||
    movingPath === file.path
  const isActionDisabled = Boolean(renamingPath || movingPath) || isLoading

  return (
    <tr>
      <td className="min-w-0 font-medium">
        <span className="flex w-full min-w-0 items-start gap-1 sm:gap-2 align-middle">
          <fileIcon.Icon className={`h-5 w-5 shrink-0 ${fileIcon.color}`} />
          <button
            type="button"
            className="min-w-0 truncate text-left link link-hover"
            onClick={() => openFilePreview(file)}
          >
            <SearchHighlightedName
              name={file.name}
              ranges={file.searchMatchRanges ?? []}
              rowKey={rowKey}
            />
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell text-xs select-none">
        <span className="tooltip" data-tip={`${file.size.toLocaleString()} 字节`}>
          {formatBytes(file.size)}
        </span>
      </td>
      <td className="hidden whitespace-nowrap text-base-content/50 sm:table-cell text-xs select-none">
        <span className="tooltip" data-tip={createdAtTooltip}>
          <span title={createdAtTooltip}>{formatDate(file.uploadedAt)}</span>
        </span>
      </td>
      <td className="text-right">
        <RowActionsMenu
          isActionDisabled={isActionDisabled}
          isLoading={isLoading}
          items={[
            {
              label: '下载',
              Icon: MdiDownload,
              onClick: () => void downloadDashboardFile(file.path, file.name),
            },
            {
              label: '分享',
              Icon: MdiShareVariantOutline,
              onClick: () => openFileShare(file),
            },
            {
              label: '重命名',
              Icon: MdiPencil,
              onClick: () =>
                requestRenameTarget({ type: 'file', path: file.path, name: file.name }),
            },
            {
              label: '移动',
              Icon: MdiFolderMoveOutline,
              onClick: () => requestMoveTarget({ type: 'file', path: file.path, name: file.name }),
            },
            {
              label: '删除',
              Icon: MdiDeleteOutline,
              tone: 'danger',
              onClick: () =>
                requestDeleteTarget({ type: 'file', path: file.path, name: file.name }),
            },
            {
              label: '查看详情',
              Icon: MdiInformationOutline,
              onClick: () => openFileDetails(file),
            },
          ]}
        />
      </td>
    </tr>
  )
}
