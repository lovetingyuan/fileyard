import { Fragment, useRef, useState, type ComponentType } from 'react'
import QRCodeImport from 'react-qr-code'
import MdiQrcodeScan from '~icons/mdi/qrcode-scan'
import toast from 'react-hot-toast'
import type { FileOperationTarget, ShareDurationOption, ShareLinkResponse } from '../../../../types'
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

function getShareTargetTitle(targets: FileOperationTarget[]): string {
  const title =
    targets.length > 1
      ? `已选择 ${targets
          .slice(0, 3)
          .map(v => v.name)
          .join(', ')} 等${targets.length}个文件`
      : (targets[0]?.name ?? '未知文件')
  return title
}

export function ShareFileModal() {
  const { shareTargets, sharing } = useAppStore()
  const activeShareTargets = sharing ? shareTargets : []
  const isMultiFileShare = activeShareTargets.length > 1
  const shareTargetTitle = getShareTargetTitle(activeShareTargets)
  const [expiresInSeconds, setExpiresInSeconds] =
    useState<ShareDurationOption>(DEFAULT_SHARE_DURATION)
  const [sharePassword, setSharePassword] = useState('')
  const [shareLink, setShareLink] = useState<ShareLinkResponse | null>(null)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false)
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
    setIsQrCodeModalOpen(false)
    setShareLink(null)
    setLoadError(null)
  }

  if (activeShareTargets.length === 0) {
    return null
  }

  const passwordError = getSharePasswordError(sharePassword)
  const shareDurationLabel = formatShareDuration(expiresInSeconds)
  const isLoading = isMutating
  const shareText = shareLink
    ? [
        isMultiFileShare
          ? `文件数量：${shareLink.fileCount} 个文件`
          : `文件名：${shareLink.fileName}`,
        isMultiFileShare
          ? `文件列表：${shareLink.files.map(file => file.fileName).join('、')}`
          : null,
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
    setIsQrCodeModalOpen(false)
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
    setIsQrCodeModalOpen(false)
    setLoadError(null)
    setShareLink(null)

    try {
      const response = await createShareLink(
        activeShareTargets.map(target => target.path),
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
    <>
      <Dialog
        isOpen
        title={
          <h3 className="text-lg font-semibold tracking-normal text-base-content">文件分享</h3>
        }
        onClose={handleClose}
        onConfirm={handleShare}
        onAfterOpen={handleAfterOpen}
        confirmText="分享"
        confirmDisabled={isLoading || Boolean(passwordError) || !shareLink}
        boxClassName="w-[min(25rem,94vw)] max-w-none border border-base-300/70 bg-base-100 p-0 shadow-2xl"
        headerClassName="mb-0 border-b border-base-200 px-4 py-3"
        bodyClassName="px-4 py-3.5"
        footerClassName="mt-0 border-t border-base-200 px-4 py-3"
        closeButtonAriaLabel="关闭分享弹窗"
        confirmButtonClassName="btn btn-sm btn-primary min-w-24"
      >
        <div
          className={cn(
            'mb-3 text-sm font-medium leading-6 text-base-content',
            isMultiFileShare ? 'break-all' : 'truncate',
          )}
          title={shareTargetTitle}
        >
          <span className="select-none text-gray-400">
            {isMultiFileShare ? '文件： ' : '文件名： '}
          </span>
          {isMultiFileShare ? (
            <span>
              已选择{' '}
              {activeShareTargets.slice(0, 3).map((target, index) => (
                <Fragment key={target.path}>
                  {index > 0 ? ', ' : null}
                  <code className="rounded bg-base-200 px-1 py-0.5 text-xs text-base-content">
                    {target.name}
                  </code>
                </Fragment>
              ))}{' '}
              等{activeShareTargets.length}个文件
            </span>
          ) : (
            <span>{shareTargetTitle}</span>
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
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square shrink-0"
                  onClick={() => setIsQrCodeModalOpen(true)}
                  aria-label="显示二维码"
                  title="显示二维码"
                >
                  <MdiQrcodeScan className="h-4 w-4" />
                </button>
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
      </Dialog>

      {shareLink && isQrCodeModalOpen ? (
        <Dialog
          isOpen
          title={
            <h3 className="text-lg font-semibold tracking-normal text-base-content">分享二维码</h3>
          }
          onClose={() => setIsQrCodeModalOpen(false)}
          showCancelButton={false}
          showConfirmButton={false}
          supportFullscreen
          boxClassName="w-[min(22rem,90vw)] max-w-none border border-base-300/70 bg-base-100 p-0 shadow-2xl"
          headerClassName="mb-0 border-b border-base-200 px-4 py-3"
          bodyClassName="flex min-h-0 flex-1 px-4 py-4"
          closeButtonAriaLabel="关闭二维码弹窗"
        >
          <div className="grid min-h-0 w-full place-items-center">
            <div className="aspect-square w-[min(100%,calc(100dvh-8rem))] max-w-[calc(100vw-2rem)] rounded-lg border border-base-300/80 bg-white p-3">
              <QRCode
                value={shareLink.shareUrl}
                size={256}
                className="block h-full w-full [shape-rendering:crispEdges]"
                bgColor="#ffffff"
                fgColor="#111827"
              />
            </div>
          </div>
        </Dialog>
      ) : null}
    </>
  )
}
