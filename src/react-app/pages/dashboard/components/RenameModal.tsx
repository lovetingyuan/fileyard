import { type KeyboardEvent, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Dialog } from '../../../components/Dialog'
import { useRenameFileMutation, useRenameFolderMutation } from '../../../hooks/useFilesApi'
import { useAppStore } from '../../../store'
import { getRenameValidationMessage } from '../../../utils/renameValidation'
import { closeRenameTarget, setRenamingPath } from '../actions'
import { useDashboardFileView } from '../hooks/useDashboardFileView'
import {
  FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE,
  isFolderOperationBlockedByActiveUpload,
} from '../hooks/useUploadQueue'
import { shouldConfirmFromInputKey } from '../utils/modalKeyboard'
import {
  focusRenameInput,
  getRenameConfirmButtonClassName,
  getRenameConfirmText,
  getRenameInputClassName,
  getRenameInputInitialValue,
  getRenameValidationMessageForInput,
  getVisibleRenameValidationMessage,
  isRenameConfirmDisabled,
  shouldCloseRenameWithoutSaving,
} from '../utils/renameModalInput'

export function RenameModal() {
  const { pendingRenameTarget, renamingPath, uploadQueue } = useAppStore()
  const { data, refresh } = useDashboardFileView()
  const { renameFile } = useRenameFileMutation()
  const { renameFolder } = useRenameFolderMutation()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [name, setName] = useState(() => getRenameInputInitialValue(pendingRenameTarget?.name))
  const [hasEditedName, setHasEditedName] = useState(false)
  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node
  }
  const focusInputAfterOpen = () => {
    focusRenameInput(inputRef.current)
  }

  if (!pendingRenameTarget) {
    return null
  }

  const trimmedName = name.trim()
  const targetTypeLabel = pendingRenameTarget.type === 'file' ? '文件' : '文件夹'
  const rawValidationMessage = getRenameValidationMessage({
    currentName: pendingRenameTarget.name,
    files: data.files,
    folders: data.folders,
    name,
    type: pendingRenameTarget.type,
  })
  const validationMessage = getRenameValidationMessageForInput({
    currentName: pendingRenameTarget.name,
    name,
    rawValidationMessage,
  })
  const visibleValidationMessage = getVisibleRenameValidationMessage(
    validationMessage,
    hasEditedName,
  )
  const isRenaming = Boolean(renamingPath)
  const confirmDisabled = isRenameConfirmDisabled({
    currentName: pendingRenameTarget.name,
    isRenaming,
    isUploadBlocked: false,
    name,
    validationMessage,
  })
  const confirmText = getRenameConfirmText({
    currentName: pendingRenameTarget.name,
    name,
    type: pendingRenameTarget.type,
  })
  const confirmButtonClassName = getRenameConfirmButtonClassName({
    currentName: pendingRenameTarget.name,
    name,
    type: pendingRenameTarget.type,
  })

  const handleClose = () => {
    if (!isRenaming) {
      closeRenameTarget()
    }
  }

  const handleSave = async () => {
    if (confirmDisabled) {
      return
    }

    if (
      pendingRenameTarget.type === 'folder' &&
      isFolderOperationBlockedByActiveUpload(uploadQueue, pendingRenameTarget.path)
    ) {
      toast.error(FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE)
      return
    }

    if (
      shouldCloseRenameWithoutSaving({
        currentName: pendingRenameTarget.name,
        name,
      })
    ) {
      closeRenameTarget()
      return
    }

    setRenamingPath(pendingRenameTarget.path)
    try {
      if (pendingRenameTarget.type === 'file') {
        await renameFile(pendingRenameTarget.path, trimmedName)
      } else {
        await renameFolder(pendingRenameTarget.path, trimmedName)
      }
      await refresh()
      toast.success(`"${pendingRenameTarget.name}" renamed`)
      closeRenameTarget()
    } catch (error) {
      await refresh()
      toast.error(error instanceof Error ? error.message : 'Failed to rename')
    }
    setRenamingPath(null)
  }

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      !shouldConfirmFromInputKey({
        key: event.key,
        isComposing: event.nativeEvent.isComposing,
      })
    ) {
      return
    }

    event.preventDefault()
    void handleSave()
  }

  return (
    <Dialog
      isOpen
      title="重命名"
      onClose={handleClose}
      onConfirm={handleSave}
      confirmText={confirmText}
      confirmButtonClassName={confirmButtonClassName}
      confirmPendingText="保存中..."
      confirmDisabled={confirmDisabled}
      confirmLoading={isRenaming}
      isDismissDisabled={isRenaming}
      boxClassName="max-w-md border border-base-300/70 bg-base-100"
      closeButtonAriaLabel="关闭重命名弹窗"
      onAfterOpen={focusInputAfterOpen}
    >
      {({ isInteractionDisabled }) => (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-base-content/70">
            将 “{pendingRenameTarget.name}” {targetTypeLabel}重命名为
          </p>
          <label className="flex flex-col gap-1.5">
            <input
              ref={setInputRef}
              type="text"
              className={getRenameInputClassName({
                isUploadBlocked: false,
                visibleValidationMessage,
              })}
              value={name}
              onChange={event => {
                setHasEditedName(true)
                setName(event.target.value)
              }}
              onKeyDown={handleNameKeyDown}
              disabled={isInteractionDisabled}
            />
            {visibleValidationMessage ? (
              <span className="text-xs text-error">{visibleValidationMessage}</span>
            ) : null}
          </label>
        </div>
      )}
    </Dialog>
  )
}
