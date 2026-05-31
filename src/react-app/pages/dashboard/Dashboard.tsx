import { useEffect, useRef, useState } from 'react'
import MdiAlertCircleOutline from '~icons/mdi/alert-circle-outline'
import toast from 'react-hot-toast'
import { useUploadUnloadProtection } from '../../hooks/useUploadUnloadProtection'
import { useAppStore } from '../../store'
import { getDroppedUploadFiles } from '../../utils/uploadDrop'
import { DashboardFileList } from './components/DashboardFileList'
import { DeleteConfirmModal } from './components/DeleteConfirmModal'
import { DirectoryStatsModal } from './components/DirectoryStatsModal'
import { FileDetailsModal } from './components/FileDetailsModal'
import { FileToolbar, type FileToolbarHandle } from './components/FileToolbar'
import { MoveModal } from './components/MoveModal'
import { NewFolderModal } from './components/NewFolderModal'
import { NewTextFileModal } from './components/NewTextFileModal'
import { PreviewModal } from './components/PreviewModal'
import { RenameModal } from './components/RenameModal'
import { ShareFileModal } from './components/ShareFileModal'
import { UploadProgressPanel } from './components/UploadProgressPanel'
import { useDashboardFileView } from './hooks/useDashboardFileView'
import { useUploadQueue } from './hooks/useUploadQueue'
import { uploadDashboardFiles } from './uploadFiles'
import { shouldFocusDashboardSearchFromShortcut } from './utils/searchShortcut'

const MISSING_PATH_DISABLED_MESSAGE = '当前文件路径不存在，无法在此位置上传或新建文件'

export function Dashboard() {
  const {
    currentFile,
    isCreatingNewFolder,
    addNewFolderName,
    pendingRenameTarget,
    pendingMoveTarget,
    movingPath,
    renamingPath,
    savingTextFile,
    sharing,
  } = useAppStore()
  const {
    currentPath,
    error,
    filteredFiles,
    filteredFolders,
    isCurrentPathMissing,
    isLoading,
    refresh,
    searchInputValue,
  } = useDashboardFileView()
  const uploadQueue = useUploadQueue({
    currentPath,
    onUploadsComplete: refresh,
  })
  const [isDraggingUpload, setIsDraggingUpload] = useState(false)
  const dragDepthRef = useRef(0)
  const fileToolbarRef = useRef<FileToolbarHandle | null>(null)
  const isFileUploadInProgress = savingTextFile || uploadQueue.isUploading
  const isFileMutationDisabled = Boolean(renamingPath || movingPath)
  const isCurrentPathMutationDisabled = isFileMutationDisabled || isCurrentPathMissing

  useUploadUnloadProtection(isFileUploadInProgress)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldFocusDashboardSearchFromShortcut(event, document.activeElement)) {
        return
      }

      event.preventDefault()
      fileToolbarRef.current?.focusSearchInput()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepthRef.current += 1
    setIsDraggingUpload(!isCurrentPathMutationDisabled)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isCurrentPathMutationDisabled ? 'none' : 'copy'
    }
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setIsDraggingUpload(false)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDraggingUpload(false)

    void (async () => {
      try {
        if (isCurrentPathMutationDisabled) {
          toast.error(
            isCurrentPathMissing
              ? MISSING_PATH_DISABLED_MESSAGE
              : 'File operation in progress, please wait',
          )
          return
        }

        const { files, source } = await getDroppedUploadFiles(event.dataTransfer)
        await uploadDashboardFiles({
          files,
          source,
          isFileMutationDisabled: false,
        })
      } catch {
        toast.error('Failed to read dropped files')
      }
    })()
  }

  return (
    <div className="flex flex-1 flex-col">
      <DeleteConfirmModal />
      <DirectoryStatsModal />
      <FileDetailsModal />
      {pendingRenameTarget ? <RenameModal key={pendingRenameTarget.path} /> : null}
      {pendingMoveTarget ? <MoveModal key={pendingMoveTarget.path} /> : null}
      {sharing && currentFile ? <ShareFileModal key={currentFile.path} /> : null}
      <PreviewModal />
      {isCreatingNewFolder ? <NewFolderModal key={addNewFolderName} /> : null}
      <NewTextFileModal />
      <UploadProgressPanel />
      <main className="mx-auto flex w-[96%] max-w-300 flex-1 flex-col gap-4 py-6 md:w-[90%]">
        <section className="card bg-base-100 shadow-sm">
          <div
            className={`card-body gap-6 rounded-box border border-transparent transition-colors duration-150 ${
              isDraggingUpload ? 'border-primary bg-primary/30 ring-2 ring-primary/40' : ''
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <FileToolbar ref={fileToolbarRef} isCurrentPathMissing={isCurrentPathMissing} />

            {isCurrentPathMissing ? (
              <div className="rounded-box border border-warning/30 bg-warning/10 p-10">
                <div className="flex flex-col items-center gap-3 text-center text-base-content/70">
                  <MdiAlertCircleOutline className="h-12 w-12 text-warning" />
                  <div className="space-y-1">
                    <h2 className="text-base font-medium text-base-content">当前文件路径不存在</h2>
                    <p className="break-all text-sm">
                      无法找到路径{' '}
                      <span className="font-mono text-base-content">/{currentPath}</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-box border border-base-300 bg-base-200 p-10">
                <div className="flex flex-col items-center gap-3 text-center text-base-content/60">
                  <MdiAlertCircleOutline className="h-12 w-12 text-error" />
                  <p className="text-sm">Failed to load files</p>
                </div>
              </div>
            ) : (
              <DashboardFileList
                filteredFiles={filteredFiles}
                filteredFolders={filteredFolders}
                isLoading={isLoading}
                searchInputValue={searchInputValue}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
