import toast from 'react-hot-toast'
import { useId } from 'react'
import { Dialog } from '../../../components/Dialog'
import { useUploadFileMutation } from '../../../hooks/useFilesApi'
import { useAppStore } from '../../../store'
import { closeNewTextFile, setSavingTextFile, updateNewTextFileDraft } from '../actions'
import { runWithLargeFileUploadToast } from '../fileOperations'
import { useDashboardFileView } from '../hooks/useDashboardFileView'
import { useDashboardPath } from '../hooks/useDashboardPath'
import {
  getNewTextFileConfirmButtonClassName,
  getNewTextFileConfirmText,
} from './newTextFileModalState'

export function NewTextFileModal() {
  const { addNewTextFile } = useAppStore()
  const { currentPath } = useDashboardPath()
  const { refresh } = useDashboardFileView()
  const { uploadFile } = useUploadFileMutation()
  const fileNameInputId = useId()
  const fileContentTextareaId = useId()

  if (!addNewTextFile) {
    return null
  }

  const handleSave = async () => {
    const filename = addNewTextFile.name.trim()
    if (!filename) {
      return
    }

    try {
      setSavingTextFile(true)
      const blob = new Blob([addNewTextFile.content], { type: 'text/plain;charset=utf-8' })
      const file = new File([blob], filename, { type: 'text/plain;charset=utf-8' })
      await runWithLargeFileUploadToast(file, async () => {
        await uploadFile(file, currentPath)
        await refresh()
      })
      closeNewTextFile()
      toast.success(`"${filename}" created`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create file')
    } finally {
      setSavingTextFile(false)
    }
  }

  return (
    <Dialog
      isOpen
      title="新建文本文件"
      onClose={closeNewTextFile}
      onConfirm={handleSave}
      confirmText={getNewTextFileConfirmText(addNewTextFile.name)}
      confirmPendingText="保存中..."
      confirmButtonClassName={getNewTextFileConfirmButtonClassName(addNewTextFile.name)}
      confirmDisabled={!addNewTextFile.name.trim()}
      boxClassName="flex w-[95vw] max-w-3xl flex-col"
      bodyClassName="flex flex-1 flex-col gap-4"
      closeButtonAriaLabel="关闭新建文本文件弹窗"
    >
      {({ isConfirming }) => (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm" htmlFor={fileNameInputId}>
              <span>文件名</span>
            </label>
            <input
              id={fileNameInputId}
              type="text"
              placeholder="example.txt"
              className="input w-full"
              value={addNewTextFile.name}
              onChange={event => updateNewTextFileDraft({ name: event.target.value })}
              disabled={isConfirming}
            />
          </div>

          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm" htmlFor={fileContentTextareaId}>
              <span>文件内容</span>
            </label>
            <textarea
              id={fileContentTextareaId}
              className="textarea w-full h-80 font-mono text-sm"
              placeholder="输入文本内容..."
              value={addNewTextFile.content}
              onChange={event => updateNewTextFileDraft({ content: event.target.value })}
              disabled={isConfirming}
            />
          </div>
        </>
      )}
    </Dialog>
  )
}
