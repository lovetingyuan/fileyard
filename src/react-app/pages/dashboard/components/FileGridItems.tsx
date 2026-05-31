import MdiFolder from '~icons/mdi/folder'
import type { FileEntry, FolderEntry } from '../../../../types'
import { getFileIcon } from '../../../constants/fileIcons'
import { openFilePreview } from '../actions'
import { useDashboardPath } from '../hooks/useDashboardPath'
import type { SearchMatchRange } from '../utils/searchMatch'
import { FileActionsMenu, FolderActionsMenu } from './FileEntryActions'
import { FileEntryName } from './FileEntryName'

type DashboardFolder = FolderEntry & {
  searchMatchRanges?: SearchMatchRange[]
}

type DashboardFile = FileEntry & {
  searchMatchRanges?: SearchMatchRange[]
}

const GRID_ITEM_CLASS =
  'group relative z-0 flex min-h-30 flex-col rounded-box bg-base-100 p-2 pt-3 transition-colors hover:z-10 hover:bg-base-200/70 focus-within:z-50 focus-within:bg-base-200/70'
const GRID_ITEM_BUTTON_CLASS =
  'flex min-h-24 w-full min-w-0 flex-1 flex-col items-center justify-start rounded-md px-1 pt-3 pb-2 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40'
const GRID_ITEM_NAME_CLASS =
  'mt-2 w-full overflow-hidden break-all text-center text-xs font-medium leading-4 text-base-content [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]'
const GRID_ACTIONS_CLASS =
  'absolute right-1 top-1 z-20 opacity-100 transition-opacity focus-within:z-[90] [@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100'

export function FolderGridItem({ folder }: { folder: DashboardFolder }) {
  const { setPath } = useDashboardPath()
  const entryKey = `folder:${folder.path}`

  return (
    <div className={GRID_ITEM_CLASS} role="listitem">
      <div className={GRID_ACTIONS_CLASS}>
        <FolderActionsMenu folder={folder} variant="grid" />
      </div>
      <button
        type="button"
        className={GRID_ITEM_BUTTON_CLASS}
        onClick={() => setPath(folder.path)}
        title={folder.name}
      >
        <MdiFolder className="h-10 w-10 shrink-0 text-warning" />
        <span className={`${GRID_ITEM_NAME_CLASS} font-bold`}>
          <FileEntryName name={folder.name} ranges={folder.searchMatchRanges} entryKey={entryKey} />
        </span>
      </button>
    </div>
  )
}

export function FileGridItem({ file }: { file: DashboardFile }) {
  const fileIcon = getFileIcon(file.name)
  const entryKey = `file:${file.path}`

  return (
    <div className={GRID_ITEM_CLASS} role="listitem">
      <div className={GRID_ACTIONS_CLASS}>
        <FileActionsMenu file={file} variant="grid" />
      </div>
      <button
        type="button"
        className={GRID_ITEM_BUTTON_CLASS}
        onClick={() => openFilePreview(file)}
        title={file.name}
      >
        <fileIcon.Icon className={`h-10 w-10 shrink-0 ${fileIcon.color}`} />
        <span className={GRID_ITEM_NAME_CLASS}>
          <FileEntryName name={file.name} ranges={file.searchMatchRanges} entryKey={entryKey} />
        </span>
      </button>
    </div>
  )
}
