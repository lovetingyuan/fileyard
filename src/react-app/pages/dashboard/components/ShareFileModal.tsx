import { useRef, useState, type ComponentType } from 'react'
import QRCodeImport from 'react-qr-code'
import toast from 'react-hot-toast'
import type { ShareDurationOption, ShareLinkResponse } from '../../../../types'
import { Dialog } from '../../../components/Dialog'
import { ShareLinkCopyButton } from '../../../components/ShareLinkCopyButton'
import { useCreateShareLinkMutation } from '../../../hooks/useFilesApi'
import { useAppStore } from '../../../store'
import { cn } from '../../../utils/cn'
import { getSharePasswordError, normalizeSharePassword } from '../../../utils/sharePassword'
import {
  formatShareDuration,
  formatShareExpiry,
  shareDurationOptions,
} from '../../../utils/shareDurations'
import { closeFileShare } from '../actions'

type QRCodeComponentProps = {
  value: string
  size?: number
  className?: string
  bgColor?: string
  fgColor?: string
}

const DEFAULT_SHARE_DURATION: ShareDurationOption = 3600
const QRCode = ((QRCodeImport as unknown as { QRCode?: unknown; default?: unknown }).QRCode ??
  (QRCodeImport as unknown as { default?: unknown }).default ??
  QRCodeImport) as ComponentType<QRCodeComponentProps>

export function ShareFileModal() {
  const { currentFile, sharing } = useAppStore()
  const file = sharing ? currentFile : null
  const [expiresInSeconds, setExpiresInSeconds] =
    useState<ShareDurationOption>(DEFAULT_SHARE_DURATION)
  const [sharePassword, setSharePassword] = useState('')
  const [shareLink, setShareLink] = useState<ShareLinkResponse | null>(null)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const hasGeneratedOnOpenRef = useRef(false)
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { createShareLink, isMutating } = useCreateShareLinkMutation()

  const clearCopyFeedbackTimeout = () => {
    if (copyFeedbackTimeoutRef.current === null) {
      return
    }

    clearTimeout(copyFeedbackTimeoutRef.current)
    copyFeedbackTimeoutRef.current = null
  }

  const resetCopyFeedback = () => {
    clearCopyFeedbackTimeout()
    setIsLinkCopied(false)
  }

  const clearGeneratedLink = () => {
    requestIdRef.current += 1
    resetCopyFeedback()
    setShareLink(null)
    setLoadError(null)
  }

  if (!file) {
    return null
  }

  const passwordError = getSharePasswordError(sharePassword)
  const shareDurationLabel = formatShareDuration(expiresInSeconds)
  const isLoading = isMutating
  const shareText = shareLink
    ? [
        `文件名：${shareLink.fileName}`,
        `过期时间：${formatShareExpiry(shareLink.expiresAt)}`,
        `有效时长：${shareDurationLabel}`,
        shareLink.passwordProtected ? '该链接需要分享密码，请通过其他渠道发送密码。' : null,
        `下载链接：${shareLink.shareUrl}`,
      ]
        .filter((line): line is string => Boolean(line))
        .join('\n')
    : ''

  const handleClose = () => {
    hasGeneratedOnOpenRef.current = false
    resetCopyFeedback()
    closeFileShare()
  }

  const generateShareLink = async (
    nextExpiresInSeconds: ShareDurationOption,
    nextSharePassword: string,
  ) => {
    if (getSharePasswordError(nextSharePassword)) {
      clearGeneratedLink()
      return
    }

    const normalizedPassword = normalizeSharePassword(nextSharePassword)
    const currentRequestId = requestIdRef.current + 1
    requestIdRef.current = currentRequestId
    resetCopyFeedback()
    setLoadError(null)
    setShareLink(null)

    try {
      const response = await createShareLink(
        file.path,
        nextExpiresInSeconds,
        normalizedPassword || undefined,
      )
      if (requestIdRef.current !== currentRequestId) {
        return
      }
      setShareLink(response)
    } catch (error) {
      if (requestIdRef.current !== currentRequestId) {
        return
      }
      setLoadError(error instanceof Error ? error.message : 'Failed to generate share link')
    }
  }

  const handleAfterOpen = () => {
    if (hasGeneratedOnOpenRef.current) {
      return
    }

    hasGeneratedOnOpenRef.current = true
    void generateShareLink(expiresInSeconds, sharePassword)
  }

  const handleCopyLink = async () => {
    if (!shareLink) {
      return
    }

    try {
      await navigator.clipboard.writeText(shareLink.shareUrl)
      clearCopyFeedbackTimeout()
      setIsLinkCopied(true)
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        copyFeedbackTimeoutRef.current = null
        setIsLinkCopied(false)
      }, 1600)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to copy share link')
    }
  }

  const handleShare = async () => {
    if (!shareLink) {
      return
    }

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: shareLink.fileName,
          text: shareText,
          url: shareLink.shareUrl,
        })
        return
      }

      await navigator.clipboard.writeText(shareText)
      toast.success('浏览器不支持系统分享，已复制分享内容')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      if (typeof navigator.share !== 'function') {
        toast.error(error instanceof Error ? error.message : 'Failed to copy share link')
        return
      }

      toast.error(error instanceof Error ? error.message : 'Failed to share file')
    }
  }

  return (
    <Dialog
      isOpen
      title={<h3 className="text-lg font-semibold tracking-normal text-base-content">文件分享</h3>}
      onClose={handleClose}
      onConfirm={handleShare}
      onAfterOpen={handleAfterOpen}
      confirmText="分享"
      confirmDisabled={isLoading || Boolean(passwordError) || !shareLink}
      boxClassName="w-[min(34rem,94vw)] max-w-none border border-base-300/70 bg-base-100 p-0 shadow-2xl"
      headerClassName="mb-0 border-b border-base-200 px-4 py-3"
      bodyClassName="px-4 py-3.5"
      footerClassName="mt-0 border-t border-base-200 px-4 py-3"
      closeButtonAriaLabel="关闭分享弹窗"
      confirmButtonClassName="btn btn-sm btn-primary min-w-24"
    >
      <div
        className="mb-3 truncate text-sm font-medium leading-6 text-base-content"
        title={file.name}
      >
        <span className="select-none text-gray-400">文件名： </span>
        <span>{file.name}</span>
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <div className="grid w-[clamp(8.5rem,38vw,15rem)] place-items-center rounded-lg border border-base-300/80 bg-base-200/25 p-1">
          {shareLink ? (
            <QRCode
              value={shareLink.shareUrl}
              size={456}
              className="block h-auto w-full rounded bg-white p-2 [shape-rendering:crispEdges]"
              bgColor="#ffffff"
              fgColor="#111827"
            />
          ) : (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded bg-white p-3 text-center text-base-content/55">
              <div className="text-sm font-medium text-base-content/70">
                {isLoading ? '正在生成二维码' : '生成后显示二维码'}
              </div>
              <div className="max-w-44 text-xs leading-5 text-base-content/50">
                可设置分享密码，生成后再复制或分享链接
              </div>
            </div>
          )}
        </div>

        <div className="grid min-w-0 gap-2.5">
          <label className="grid min-w-0 gap-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-center">
            <span className="shrink-0 text-xs font-semibold text-base-content/50">有效时间</span>
            <select
              className="select select-sm w-full min-w-0"
              value={String(expiresInSeconds)}
              onChange={event => {
                const nextExpiresInSeconds = Number(event.target.value) as ShareDurationOption
                setExpiresInSeconds(nextExpiresInSeconds)
                void generateShareLink(nextExpiresInSeconds, sharePassword)
              }}
            >
              {shareDurationOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-start">
            <span className="shrink-0 pt-2 text-xs font-semibold text-base-content/50">
              分享密码
            </span>
            <span className="min-w-0">
              <input
                type="password"
                className={cn('input input-sm w-full min-w-0', passwordError && 'input-error')}
                value={sharePassword}
                autoComplete="new-password"
                placeholder="可选，至少 6 位"
                onChange={event => {
                  setSharePassword(event.target.value)
                  clearGeneratedLink()
                }}
                onBlur={event => {
                  if (!shareLink) {
                    void generateShareLink(expiresInSeconds, event.currentTarget.value)
                  }
                }}
              />
              {passwordError ? (
                <span className="mt-1 block text-xs text-error">{passwordError}</span>
              ) : null}
            </span>
          </label>

          <div className="grid min-w-0 gap-1.5">
            {loadError ? (
              <div className="rounded-lg border border-error/25 bg-error/5 px-3 py-2 text-sm leading-6 text-error">
                {loadError}
              </div>
            ) : shareLink ? (
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                <a
                  href={shareLink.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={shareLink.shareUrl}
                  className="link min-w-0 flex-1 truncate font-mono text-xs text-primary"
                >
                  {shareLink.shareUrl}
                </a>
                <ShareLinkCopyButton
                  isCopied={isLinkCopied}
                  onClick={() => void handleCopyLink()}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm leading-6 text-base-content/50">
                {isLoading ? '正在生成链接...' : '链接生成后显示'}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
