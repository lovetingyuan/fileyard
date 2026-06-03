import MdiFolder from '~icons/mdi/folder'
import type { FileEntry, FolderEntry } from '../../../../types'
import { getFileIcon } from '../../../constants/fileIcons'
import { formatBytes, formatDate, formatDetailedDate } from '../../../utils/fileFormatters'
import { openFilePreview } from '../actions'
import { useDashboardEntrySelection } from '../hooks/useDashboardEntrySelection'
import { useDashboardPath } from '../hooks/useDashboardPath'
import type { SearchMatchRange } from '../utils/searchMatch'
import { FileActionsMenu, FolderActionsMenu } from './FileEntryActions'
import { FileEntryName } from './FileEntryName'

const ENTRY_CHECKBOX_CLASS = 'checkbox checkbox-primary checkbox-sm h-5 w-5 shrink-0'
const SELECTED_ROW_CLASS = '[&_td]:bg-primary/15'

function TableEntryCheckbox({
  ariaLabel,
  checked,
  className = '',
  onChange,
  onClick,
}: {
  ariaLabel: string
  checked: boolean
  className?: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onClick: (event: React.MouseEvent<HTMLInputElement>) => void
}) {
  return (
    <input
      type="checkbox"
      className={`${ENTRY_CHECKBOX_CLASS} ${className}`.trim()}
      checked={checked}
      onChange={onChange}
      onClick={onClick}
      aria-label={ariaLabel}
    />
  )
}

function TableActionsSlot({
  children,
  isSelectionActive,
}: {
  children: React.ReactNode
  isSelectionActive: boolean
}) {
  return (
    <div
      className={`flex justify-end ${isSelectionActive ? 'invisible pointer-events-none' : ''}`.trim()}
      aria-hidden={isSelectionActive}
    >
      {children}
    </div>
  )
}

type DashboardFolder = FolderEntry & {
  searchMatchRanges?: SearchMatchRange[]
}

type DashboardFile = FileEntry & {
  searchMatchRanges?: SearchMatchRange[]
}

export function FolderRow({ folder }: { folder: DashboardFolder }) {
  const { setPath } = useDashboardPath()
  const rowKey = `folder:${folder.path}`
  const selection = useDashboardEntrySelection({
    type: 'folder',
    path: folder.path,
    name: folder.name,
  })

  return (
    <tr
      className={`group ${selection.isSelectionActive ? 'cursor-pointer' : ''} ${
        selection.isSelected ? SELECTED_ROW_CLASS : ''
      }`.trim()}
      onClick={selection.handleActiveSelectionClick}
      onPointerDown={selection.handlePointerDown}
      onPointerUp={selection.handlePointerEnd}
      onPointerLeave={selection.handlePointerEnd}
      onPointerCancel={selection.handlePointerEnd}
    >
      <td className="min-w-0">
        <span className="flex w-full min-w-0 items-center gap-1 sm:gap-2 align-middle">
          {selection.isSelectionActive ? (
            <>
              <TableEntryCheckbox
                ariaLabel={`选择文件夹 ${folder.name}`}
                checked={selection.isSelected}
                onChange={selection.handleSelectionChange}
                onClick={selection.handleSelectionClick}
              />
              <MdiFolder className="h-5 w-5 shrink-0 text-warning" />
            </>
          ) : (
            <span className="relative h-5 w-5 shrink-0">
              <MdiFolder className="absolute inset-0 h-5 w-5 text-warning transition-opacity group-hover:opacity-0" />
              <TableEntryCheckbox
                ariaLabel={`选择文件夹 ${folder.name}`}
                checked={selection.isSelected}
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                onChange={selection.handleSelectionChange}
                onClick={selection.handleSelectionClick}
              />
            </span>
          )}
          <button
            type="button"
            className={`block min-w-0 truncate text-left font-bold ${
              selection.isSelectionActive ? 'cursor-pointer text-base-content' : 'link link-hover'
            }`.trim()}
            onClick={event => {
              if (selection.handleActiveSelectionClick(event)) {
                return
              }
              if (selection.shouldIgnoreEntryOpen()) {
                return
              }
              setPath(folder.path)
            }}
          >
            <FileEntryName name={folder.name} ranges={folder.searchMatchRanges} entryKey={rowKey} />
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell select-none">-</td>
      <td className="hidden whitespace-nowrap text-base-content/50 sm:table-cell text-xs select-none">
        {formatDate(folder.createdAt)}
      </td>
      <td className="text-right">
        <TableActionsSlot isSelectionActive={selection.isSelectionActive}>
          <FolderActionsMenu folder={folder} />
        </TableActionsSlot>
      </td>
    </tr>
  )
}

export function FileRow({ file }: { file: DashboardFile }) {
  const fileIcon = getFileIcon(file.name)
  const rowKey = `file:${file.path}`
  const createdAtTooltip = `创建时间：${formatDetailedDate(file.createdAt)}`
  const selection = useDashboardEntrySelection({
    type: 'file',
    path: file.path,
    name: file.name,
  })

  return (
    <tr
      className={`group ${selection.isSelectionActive ? 'cursor-pointer' : ''} ${
        selection.isSelected ? SELECTED_ROW_CLASS : ''
      }`.trim()}
      onClick={selection.handleActiveSelectionClick}
      onPointerDown={selection.handlePointerDown}
      onPointerUp={selection.handlePointerEnd}
      onPointerLeave={selection.handlePointerEnd}
      onPointerCancel={selection.handlePointerEnd}
    >
      <td className="min-w-0 font-medium">
        <span className="flex w-full min-w-0 items-start gap-1 sm:gap-2 align-middle">
          {selection.isSelectionActive ? (
            <>
              <TableEntryCheckbox
                ariaLabel={`选择文件 ${file.name}`}
                checked={selection.isSelected}
                onChange={selection.handleSelectionChange}
                onClick={selection.handleSelectionClick}
              />
              <fileIcon.Icon className={`h-5 w-5 shrink-0 ${fileIcon.color}`} />
            </>
          ) : (
            <span className="relative h-5 w-5 shrink-0">
              <fileIcon.Icon
                className={`absolute inset-0 h-5 w-5 transition-opacity group-hover:opacity-0 ${fileIcon.color}`}
              />
              <TableEntryCheckbox
                ariaLabel={`选择文件 ${file.name}`}
                checked={selection.isSelected}
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                onChange={selection.handleSelectionChange}
                onClick={selection.handleSelectionClick}
              />
            </span>
          )}
          <button
            type="button"
            className={`min-w-0 truncate text-left ${
              selection.isSelectionActive ? 'cursor-pointer text-base-content' : 'link link-hover'
            }`.trim()}
            onClick={event => {
              if (selection.handleActiveSelectionClick(event)) {
                return
              }
              if (selection.shouldIgnoreEntryOpen()) {
                return
              }
              openFilePreview(file)
            }}
          >
            <FileEntryName name={file.name} ranges={file.searchMatchRanges} entryKey={rowKey} />
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell text-xs select-none">
        <span>{formatBytes(file.size)}</span>
      </td>
      <td className="hidden whitespace-nowrap text-base-content/50 sm:table-cell text-xs select-none">
        {/* <span className="tooltip" data-tip={createdAtTooltip}> */}
        <span title={createdAtTooltip}>{formatDate(file.uploadedAt)}</span>
        {/* </span> */}
      </td>
      <td className="text-right">
        <TableActionsSlot isSelectionActive={selection.isSelectionActive}>
          <FileActionsMenu file={file} />
        </TableActionsSlot>
      </td>
    </tr>
  )
}
