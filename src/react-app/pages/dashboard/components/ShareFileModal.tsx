import { useRef, useState, type ComponentType } from 'react'
import QRCodeImport from 'react-qr-code'
import toast from 'react-hot-toast'
import type { ShareDurationOption, ShareLinkResponse } from '../../../../types'
import { Dialog } from '../../../components/Dialog'
import { ShareLinkCopyButton } from '../../../components/ShareLinkCopyButton'
import { useCreateShareLinkMutation } from '../../../hooks/useFilesApi'
import { useAppStore } from '../../../store'
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
  const normalizedPassword = normalizeSharePassword(sharePassword)
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
    resetCopyFeedback()
    closeFileShare()
  }

  const handleGenerateShareLink = async () => {
    if (passwordError) {
      return
    }

    const currentRequestId = requestIdRef.current + 1
    requestIdRef.current = currentRequestId
    resetCopyFeedback()
    setLoadError(null)
    setShareLink(null)

    try {
      const response = await createShareLink(
        file.path,
        expiresInSeconds,
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
      await handleGenerateShareLink()
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
      title={<h3 className="text-xl font-semibold tracking-normal text-base-content">文件分享</h3>}
      onClose={handleClose}
      onConfirm={handleShare}
      confirmText={shareLink ? '分享' : '生成链接'}
      confirmLoadingText="生成中"
      confirmDisabled={isLoading || Boolean(passwordError)}
      confirmLoading={isLoading}
      boxClassName="w-[min(48rem,94vw)] max-w-none border border-base-300/70 bg-base-100 p-0 shadow-2xl"
      headerClassName="mb-0 border-b border-base-200 px-5 py-4 sm:px-6"
      bodyClassName="px-5 py-5 sm:px-6"
      footerClassName="mt-0 border-t border-base-200 px-5 py-4 sm:px-6"
      closeButtonAriaLabel="关闭分享弹窗"
      confirmButtonClassName="btn btn-sm btn-primary min-w-24"
    >
      <div className="grid gap-5 sm:grid-cols-[15rem_minmax(0,1fr)] md:items-start">
        <div className="mx-auto grid aspect-square w-full max-w-72 place-items-center rounded-lg border border-base-300/80 bg-white p-2 md:max-w-none">
          {shareLink ? (
            <QRCode
              value={shareLink.shareUrl}
              size={200}
              className="block h-auto w-full max-w-[12.5rem] [shape-rendering:crispEdges]"
              bgColor="#ffffff"
              fgColor="#111827"
            />
          ) : (
            <div className="flex aspect-square w-full max-w-[12.5rem] flex-col items-center justify-center gap-2 text-center text-base-content/55">
              <div className="text-sm font-medium text-base-content/70">生成后显示二维码</div>
              <div className="max-w-44 text-xs leading-5 text-base-content/50">
                可设置分享密码，生成后再复制或分享链接
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border border-base-300/70 bg-base-200/30 px-4 py-3">
            <div className="text-xs font-medium text-base-content/45">文件名</div>
            <div
              className="mt-1 overflow-hidden text-sm font-medium leading-6 text-base-content [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
              title={file.name}
            >
              {file.name}
            </div>
          </div>

          <div className="space-y-3">
            <label className="grid gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-center">
              <span className="text-sm font-medium text-base-content/50">有效时长</span>
              <select
                className="select select-sm w-full"
                value={String(expiresInSeconds)}
                onChange={event => {
                  setExpiresInSeconds(Number(event.target.value) as ShareDurationOption)
                  clearGeneratedLink()
                }}
              >
                {shareDurationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-start">
              <span className="pt-2 text-sm font-medium text-base-content/50">分享密码</span>
              <span className="min-w-0 space-y-1">
                <input
                  type="password"
                  className={`input input-sm w-full ${passwordError ? 'input-error' : ''}`.trim()}
                  value={sharePassword}
                  autoComplete="new-password"
                  placeholder="可选，至少 6 位"
                  onChange={event => {
                    setSharePassword(event.target.value)
                    clearGeneratedLink()
                  }}
                />
                {passwordError ? (
                  <span className="block text-xs text-error">{passwordError}</span>
                ) : null}
              </span>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-start">
            <div className="flex min-h-8 items-center gap-2 text-sm font-medium text-base-content/50">
              <span>下载链接</span>
            </div>
            <div className="min-w-0">
              {loadError ? (
                <div className="text-sm leading-6 text-error">{loadError}</div>
              ) : shareLink ? (
                <div className="flex min-w-0 items-center gap-2">
                  <a
                    href={shareLink.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={shareLink.shareUrl}
                    className="link min-w-0 flex-1 truncate font-mono text-sm text-primary"
                  >
                    {shareLink.shareUrl}
                  </a>
                  <ShareLinkCopyButton
                    isCopied={isLinkCopied}
                    onClick={() => void handleCopyLink()}
                  />
                </div>
              ) : (
                <div className="text-sm leading-6 text-base-content/50">点击“生成链接”后显示</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
