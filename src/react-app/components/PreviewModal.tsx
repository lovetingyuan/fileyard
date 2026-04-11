import { Icon } from '@iconify/react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import useSWR from 'swr'
import type { FileEntry } from '../../types'
import { Dialog } from './Dialog'
import { buildPreviewUrl } from '../hooks/useFilesApi'
import {
  getPreviewContentWrapperClassName,
  getPreviewModalBoxClassName,
  getStandardAudioClassName,
  getStandardPdfClassName,
  getStandardTextClassName,
  getStandardVideoClassName,
} from './previewModalLayout'
import { getPreviewInfo } from '../utils/previewInfo'

// --- Preview size limits (in bytes) ---

const PREVIEW_SIZE_LIMITS = {
  TEXT: 2 * 1024 * 1024, // 2MB
  IMAGE: 15 * 1024 * 1024, // 15MB
  PDF: 30 * 1024 * 1024, // 30MB
  VIDEO: 200 * 1024 * 1024, // 200MB
  AUDIO: 100 * 1024 * 1024, // 100MB
} as const

async function copyToClipboard(value: string): Promise<void> {
  await navigator.clipboard.writeText(value)
}

// --- Sub-components ---

function TextPreview({
  file,
  previewUrl,
  isFullscreen,
  isEditing,
  editContent,
  isBusy,
  onEditContentChange,
  onDataLoaded,
}: {
  file: FileEntry
  previewUrl: string
  isFullscreen: boolean
  isEditing: boolean
  editContent: string
  isBusy: boolean
  onEditContentChange: (content: string) => void
  onDataLoaded?: (data: string) => void
}) {
  const tooLarge = file.size > PREVIEW_SIZE_LIMITS.TEXT
  const { data, isLoading, error } = useSWR(
    tooLarge ? null : previewUrl,
    (url: string) =>
      fetch(url, { credentials: 'include' }).then(r => {
        if (!r.ok) {
          throw new Error('加载失败')
        }
        return r.text()
      }),
    { onSuccess: d => onDataLoaded?.(d) },
  )

  if (tooLarge) {
    return (
      <UnsupportedMessage
        reason={`文件过大，无法预览（超过 ${PREVIEW_SIZE_LIMITS.TEXT / 1024 / 1024}MB）`}
      />
    )
  }
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }
  if (error) {
    return <UnsupportedMessage reason="加载文件内容失败，请稍后重试" />
  }

  if (isEditing) {
    return (
      <textarea
        className={`textarea textarea-bordered w-full font-mono text-sm resize-none ${isFullscreen ? 'h-full' : 'h-[60vh]'}`}
        value={editContent}
        onChange={e => onEditContentChange(e.target.value)}
        disabled={isBusy}
      />
    )
  }

  return (
    <pre
      className={
        isFullscreen
          ? 'overflow-auto text-sm bg-base-200 rounded-box p-4 whitespace-pre h-full'
          : getStandardTextClassName()
      }
    >
      {data}
    </pre>
  )
}

function UnsupportedMessage({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-base-content/60">
      <Icon icon="mdi:file-alert-outline" className="w-12 h-12" />
      <p className="text-sm text-center">{reason}</p>
    </div>
  )
}

function PdfPreview({
  file,
  previewUrl,
  isFullscreen,
}: {
  file: FileEntry
  previewUrl: string
  isFullscreen: boolean
}) {
  const tooLarge = file.size > PREVIEW_SIZE_LIMITS.PDF

  const {
    data: blobUrl,
    isLoading,
    error,
  } = useSWR(
    tooLarge ? null : previewUrl,
    async (url: string) => {
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) {
        throw new Error('加载失败')
      }
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    },
    { revalidateOnFocus: false },
  )

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [blobUrl])

  if (tooLarge) {
    return (
      <UnsupportedMessage
        reason={`PDF 文件过大，无法预览（超过 ${PREVIEW_SIZE_LIMITS.PDF / 1024 / 1024}MB）`}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }
  if (error) {
    return <UnsupportedMessage reason="加载 PDF 失败，请稍后重试" />
  }

  return (
    <iframe
      src={blobUrl}
      title="PDF Preview"
      className={isFullscreen ? 'w-full rounded border-0 h-full' : getStandardPdfClassName()}
    />
  )
}

// --- Main modal ---

interface PreviewModalProps {
  file: FileEntry | null
  onClose: () => void
  onSave?: (path: string, content: string) => Promise<void>
}

export function PreviewModal({ file, onClose, onSave }: PreviewModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [forceTextPreview, setForceTextPreview] = useState(false)
  const [loadedTextState, setLoadedTextState] = useState<{ path: string; content: string } | null>(
    null,
  )

  const handleClose = () => {
    setIsFullscreen(false)
    setIsEditing(false)
    setEditContent('')
    setForceTextPreview(false)
    setLoadedTextState(null)
    onClose()
  }

  const previewUrl = file ? buildPreviewUrl(file.path) : ''
  const info = file ? getPreviewInfo(file) : { kind: 'unsupported' as const }
  const effectiveInfo = forceTextPreview ? { kind: 'text' as const } : info

  if (!file) {
    return null
  }

  const canForceTextPreview = info.kind === 'unsupported' && file.size <= PREVIEW_SIZE_LIMITS.TEXT
  const canEditTextFile = effectiveInfo.kind === 'text' && Boolean(onSave)
  const loadedText = loadedTextState?.path === file.path ? loadedTextState.content : null

  const handleDataLoaded = (data: string) => {
    setLoadedTextState({ path: file.path, content: data })
  }

  const handleStartEdit = () => {
    setEditContent(loadedText ?? '')
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  const handleSave = async () => {
    if (!onSave || !file) {
      return
    }
    await onSave(file.path, editContent)
    handleClose()
  }

  const handleCopyText = async () => {
    if (loadedText === null) {
      return
    }

    try {
      await copyToClipboard(loadedText)
      toast.success('文本已复制')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '复制文本失败')
    }
  }

  let sizeError: string | null = null
  if (effectiveInfo.kind === 'image' && file.size > PREVIEW_SIZE_LIMITS.IMAGE) {
    sizeError = `图片文件过大，无法预览（超过 ${PREVIEW_SIZE_LIMITS.IMAGE / 1024 / 1024}MB）`
  } else if (effectiveInfo.kind === 'video' && file.size > PREVIEW_SIZE_LIMITS.VIDEO) {
    sizeError = `视频文件过大，无法预览（超过 ${PREVIEW_SIZE_LIMITS.VIDEO / 1024 / 1024}MB）`
  } else if (effectiveInfo.kind === 'audio' && file.size > PREVIEW_SIZE_LIMITS.AUDIO) {
    sizeError = `音频文件过大，无法预览（超过 ${PREVIEW_SIZE_LIMITS.AUDIO / 1024 / 1024}MB）`
  }
  const canCopyText = effectiveInfo.kind === 'text' && !sizeError
  const previewContentWrapperClassName = getPreviewContentWrapperClassName(
    effectiveInfo.kind,
    isEditing,
    isFullscreen,
  )
  const bodyClassName = isFullscreen
    ? 'flex-1 min-h-0 overflow-auto p-3 sm:p-4'
    : 'flex-1 min-h-0 overflow-auto p-1'

  return (
    <Dialog
      isOpen
      title={<h3 className="truncate pr-4 font-bold text-base">{file.name}</h3>}
      onClose={handleClose}
      widthMode={isFullscreen ? 'default' : 'content'}
      boxClassName={getPreviewModalBoxClassName(isFullscreen)}
      bodyClassName={bodyClassName}
      closeButtonAriaLabel="关闭文件预览弹窗"
      headerClassName="items-center"
      headerActions={
        !isEditing && effectiveInfo.kind !== 'unsupported' ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => setIsFullscreen(value => !value)}
            title={isFullscreen ? '退出全屏预览' : '全屏预览'}
          >
            <Icon
              icon={isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'}
              className="w-5 h-5"
            />
          </button>
        ) : undefined
      }
      footer={
        (canCopyText || canEditTextFile) && !sizeError
          ? ({ confirm, isConfirming }) =>
              isEditing ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={handleCancelEdit}
                    disabled={isConfirming}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm btn-primary ${isConfirming ? 'loading' : ''}`}
                    onClick={() => void confirm()}
                    disabled={isConfirming}
                  >
                    {isConfirming ? '保存中...' : '保存'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => void handleCopyText()}
                    disabled={loadedText === null}
                  >
                    <Icon icon="mdi:content-copy" className="w-4 h-4" />
                    复制文本
                  </button>
                  {canEditTextFile ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={handleStartEdit}
                    >
                      <Icon icon="mdi:pencil" className="w-4 h-4" />
                      编辑
                    </button>
                  ) : null}
                </>
              )
          : undefined
      }
      showCancelButton={false}
      showConfirmButton={false}
      onConfirm={isEditing ? handleSave : undefined}
    >
      {({ isConfirming }) => (
        <>
          {sizeError ? (
            <UnsupportedMessage reason={sizeError} />
          ) : (
            <div className={previewContentWrapperClassName}>
              {effectiveInfo.kind === 'image' && (
                <div className={isFullscreen ? 'flex h-full items-center justify-center' : 'flex justify-center'}>
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className={
                      isFullscreen
                        ? 'max-h-full max-w-full object-contain rounded'
                        : 'max-h-[70vh] max-w-full object-contain rounded'
                    }
                  />
                </div>
              )}
              {effectiveInfo.kind === 'video' && (
                <video
                  src={previewUrl}
                  controls
                  className={isFullscreen ? 'max-h-full max-w-full rounded' : getStandardVideoClassName()}
                />
              )}
              {effectiveInfo.kind === 'audio' && (
                <div className={isFullscreen ? 'flex h-full items-center justify-center' : 'flex justify-center py-8'}>
                  <audio src={previewUrl} controls className={getStandardAudioClassName()} />
                </div>
              )}
              {effectiveInfo.kind === 'pdf' && (
                <PdfPreview file={file} previewUrl={previewUrl} isFullscreen={isFullscreen} />
              )}
              {effectiveInfo.kind === 'text' && (
                <TextPreview
                  file={file}
                  previewUrl={previewUrl}
                  isFullscreen={isFullscreen}
                  isEditing={isEditing && effectiveInfo.kind === 'text'}
                  editContent={editContent}
                  isBusy={isConfirming}
                  onEditContentChange={setEditContent}
                  onDataLoaded={handleDataLoaded}
                />
              )}
              {effectiveInfo.kind === 'unsupported' && (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="text-sm text-base-content/70">
                    此文件类型不支持预览，您可以下载后查看
                  </p>
                  {canForceTextPreview ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setForceTextPreview(true)}
                      >
                        按文本打开
                      </button>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Dialog>
  )
}
