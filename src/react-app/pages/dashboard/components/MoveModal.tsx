import { useState, type ComponentType, type SVGProps } from 'react'
import MdiAlertCircleOutline from '~icons/mdi/alert-circle-outline'
import MdiFolder from '~icons/mdi/folder'
import MdiFolderOpenOutline from '~icons/mdi/folder-open-outline'
import toast from 'react-hot-toast'
import type { FolderTreeNode, MoveTarget } from '../../../../types'
import { Dialog } from '../../../components/Dialog'
import { useFolderTree, useMoveEntryMutation } from '../../../hooks/useFilesApi'
import { useAppStore } from '../../../store'
import { ApiError } from '../../../utils/apiRequest'
import { getMoveDestinationDisabledReason } from '../../../utils/moveValidation'
import { closeMoveTarget, setMovingPath } from '../actions'
import { useDashboardFileView } from '../hooks/useDashboardFileView'
import {
  FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE,
  isFolderOperationBlockedByActiveUpload,
} from '../hooks/useUploadQueue'

const MOVE_CONFLICT_MESSAGE = '目标文件夹已存在重名文件或文件夹'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

function getFolderLabel(path: string, name: string) {
  return path ? name : '根目录'
}

function FolderTreeItem({
  Icon,
  isInteractionDisabled,
  node,
  onSelect,
  selectedPath,
  target,
}: {
  Icon: IconComponent
  isInteractionDisabled: boolean
  node: FolderTreeNode
  onSelect: (path: string) => void
  selectedPath: string | null
  target: MoveTarget
}) {
  const disabledReason = getMoveDestinationDisabledReason(node.path, target)
  const isDisabled = Boolean(disabledReason) || isInteractionDisabled
  const isSelected = selectedPath === node.path
  const isSelectionVisible = isSelected && !isDisabled

  return (
    <li>
      <button
        type="button"
        className={`gap-2 ${isSelectionVisible ? 'menu-active' : ''}`.trim()}
        disabled={isDisabled}
        title={disabledReason ?? undefined}
        aria-pressed={isSelected}
        onClick={() => onSelect(node.path)}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${
            isSelectionVisible ? 'text-current' : node.path ? 'text-warning' : 'text-primary'
          }`}
        />
        <span className="min-w-0 flex-1 truncate text-left">
          {getFolderLabel(node.path, node.name)}
        </span>
        {disabledReason ? (
          <span className="shrink-0 text-xs text-base-content/45">{disabledReason}</span>
        ) : null}
      </button>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map(child => (
            <FolderTreeItem
              key={child.path}
              Icon={MdiFolder}
              isInteractionDisabled={isInteractionDisabled}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              target={target}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function FolderTreePicker({
  isInteractionDisabled,
  onSelect,
  selectedPath,
  target,
  tree,
}: {
  isInteractionDisabled: boolean
  onSelect: (path: string) => void
  selectedPath: string | null
  target: MoveTarget
  tree: FolderTreeNode
}) {
  return (
    <ul className="menu menu-md w-full">
      <FolderTreeItem
        Icon={MdiFolderOpenOutline}
        isInteractionDisabled={isInteractionDisabled}
        node={tree}
        onSelect={onSelect}
        selectedPath={selectedPath}
        target={target}
      />
    </ul>
  )
}

export function MoveModal() {
  const { movingPath, pendingMoveTarget, uploadQueue } = useAppStore()
  const { tree, error, isLoading } = useFolderTree(Boolean(pendingMoveTarget))
  const { moveEntry } = useMoveEntryMutation()
  const { refresh } = useDashboardFileView()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)

  if (!pendingMoveTarget) {
    return null
  }

  const isMoving = movingPath === pendingMoveTarget.path
  const selectedDisabledReason =
    selectedPath === null ? null : getMoveDestinationDisabledReason(selectedPath, pendingMoveTarget)
  const confirmDisabled =
    selectedPath === null || Boolean(selectedDisabledReason) || isMoving || isLoading || !tree

  const handleClose = () => {
    if (!isMoving) {
      closeMoveTarget()
    }
  }

  const handleSelect = (path: string) => {
    setSelectedPath(path)
    setConflictMessage(null)
  }

  const handleMove = async () => {
    if (confirmDisabled || selectedPath === null) {
      return
    }

    if (
      pendingMoveTarget.type === 'folder' &&
      isFolderOperationBlockedByActiveUpload(uploadQueue, pendingMoveTarget.path)
    ) {
      toast.error(FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE)
      return
    }

    setMovingPath(pendingMoveTarget.path)
    setConflictMessage(null)
    try {
      await moveEntry(pendingMoveTarget.type, pendingMoveTarget.path, selectedPath)
      await refresh()
      toast.success(`"${pendingMoveTarget.name}" moved`)
      closeMoveTarget()
    } catch (moveError) {
      await refresh()
      if (moveError instanceof ApiError && moveError.status === 409) {
        setConflictMessage(MOVE_CONFLICT_MESSAGE)
      } else {
        toast.error(moveError instanceof Error ? moveError.message : 'Failed to move')
      }
    } finally {
      setMovingPath(null)
    }
  }

  return (
    <Dialog
      isOpen
      title="移动"
      onClose={handleClose}
      onConfirm={handleMove}
      confirmText="移动"
      confirmPendingText="移动中..."
      confirmDisabled={confirmDisabled}
      confirmLoading={isMoving}
      isDismissDisabled={isMoving}
      supportFullscreen
      boxClassName="max-w-lg border border-base-300/70 bg-base-100"
      bodyClassName="flex-1 min-h-0"
      closeButtonAriaLabel="关闭移动弹窗"
    >
      {({ isFullscreen, isInteractionDisabled }) => (
        <div className="flex h-full min-h-0 flex-col gap-4">
          <p className="text-sm leading-6 text-base-content/70">
            选择 “{pendingMoveTarget.name}” 的目标文件夹
          </p>

          <div
            className={`${
              isFullscreen ? 'flex-1 min-h-0' : 'max-h-80'
            } overflow-auto rounded-box border border-base-300 bg-base-200/40 p-2`}
          >
            {isLoading && !tree ? (
              <div className="flex items-center justify-center py-10">
                <span className="loading loading-spinner loading-md text-primary"></span>
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 rounded-box bg-error/10 p-3 text-sm text-error">
                <MdiAlertCircleOutline className="mt-0.5 h-4 w-4 shrink-0" />
                <span>文件夹树加载失败</span>
              </div>
            ) : tree ? (
              <FolderTreePicker
                isInteractionDisabled={isInteractionDisabled}
                onSelect={handleSelect}
                selectedPath={selectedPath}
                target={pendingMoveTarget}
                tree={tree}
              />
            ) : null}
          </div>

          {conflictMessage ? (
            <div className="alert alert-error py-2 text-sm">
              <MdiAlertCircleOutline className="h-4 w-4" />
              <span>{conflictMessage}</span>
            </div>
          ) : null}
        </div>
      )}
    </Dialog>
  )
}
