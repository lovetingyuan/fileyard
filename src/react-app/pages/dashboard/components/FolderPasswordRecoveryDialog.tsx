import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import toast from 'react-hot-toast'
import { useSWRConfig } from 'swr'
import type { FolderPasswordModalTarget } from '../../../../types'
import { Dialog } from '../../../components/Dialog'
import {
  FILE_FOLDER_TREE_ENDPOINT,
  isFileListKey,
  useSendFolderPasswordRecoveryCodeMutation,
  useVerifyFolderPasswordRecoveryCodeMutation,
} from '../../../hooks/useFilesApi'
import { ApiError } from '../../../utils/apiRequest'
import { cn } from '../../../utils/cn'
import { shouldConfirmFromInputKey } from '../utils/modalKeyboard'

type FolderPasswordRecoveryDialogProps = {
  target: FolderPasswordModalTarget
  onClose: () => void
  onRecovered: () => void
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function FolderPasswordRecoveryDialog({
  target,
  onClose,
  onRecovered,
}: FolderPasswordRecoveryDialogProps) {
  const { mutate } = useSWRConfig()
  const { sendFolderPasswordRecoveryCode, isMutating: isSendingCode } =
    useSendFolderPasswordRecoveryCodeMutation()
  const { verifyFolderPasswordRecoveryCode, isMutating: isVerifyingCode } =
    useVerifyFolderPasswordRecoveryCodeMutation()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const isOtpValid = /^\d{6}$/u.test(otp)
  const isBusy = isSendingCode || isVerifyingCode
  const isCooldownActive = cooldownSeconds > 0

  useEffect(() => {
    if (!isCooldownActive) {
      return
    }

    const interval = window.setInterval(() => {
      setCooldownSeconds(seconds => Math.max(seconds - 1, 0))
    }, 1_000)

    return () => window.clearInterval(interval)
  }, [isCooldownActive])

  const refreshFileData = async () => {
    await mutate(key => isFileListKey(key) || key === FILE_FOLDER_TREE_ENDPOINT)
  }

  const handleConfirm = async () => {
    if (!isOtpValid || isBusy) {
      return
    }

    setError(null)
    try {
      await verifyFolderPasswordRecoveryCode(target.path, otp)
      await refreshFileData()
      toast.success(`已取消 “${target.name}” 的访问密码`)
      onRecovered()
    } catch (verifyError) {
      setError(getErrorMessage(verifyError, '验证码验证失败'))
    }
  }

  const handleSendCode = async () => {
    if (isBusy || isCooldownActive) {
      return
    }

    setError(null)
    try {
      await sendFolderPasswordRecoveryCode(target.path)
      setCooldownSeconds(60)
      toast.success('验证码已发送，有效期为 5 分钟')
    } catch (sendError) {
      if (sendError instanceof ApiError && sendError.status === 429 && sendError.retryAfterSeconds !== undefined) {
        setCooldownSeconds(sendError.retryAfterSeconds)
        setError(`发送过于频繁，请 ${sendError.retryAfterSeconds} 秒后再试`)
        return
      }

      setError(getErrorMessage(sendError, '验证码发送失败'))
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      !shouldConfirmFromInputKey({
        key: event.key,
        isComposing: event.nativeEvent.isComposing,
      })
    ) {
      return
    }

    event.preventDefault()
    void handleConfirm()
  }

  return (
    <Dialog
      isOpen
      title="验证登录邮箱"
      onClose={onClose}
      onConfirm={handleConfirm}
      onAfterOpen={() => inputRef.current?.focus()}
      confirmText="验证并取消密码"
      confirmPendingText="验证中..."
      confirmDisabled={!isOtpValid || isBusy}
      confirmLoading={isVerifyingCode}
      isDismissDisabled={isBusy}
      boxClassName="max-w-md border border-base-300/70 bg-base-100"
      closeButtonAriaLabel="关闭邮箱验证弹窗"
      confirmButtonClassName="btn btn-sm btn-error text-error-content"
    >
      {({ isInteractionDisabled }) => (
        <div className="space-y-4">
          <div role="alert" className="alert alert-info alert-soft text-sm leading-5">
            点击发送验证码，去登录邮箱查找验证码并输入，验证通过后会取消当前目录密码。
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-base-content/50">验证码</span>
            <div className="flex w-full items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className={cn(
                  'input input-md min-w-0 flex-1 tracking-[0.35em]',
                  error && 'input-error',
                )}
                value={otp}
                onChange={event => {
                  setOtp(event.target.value.replace(/\D/gu, '').slice(0, 6))
                  setError(null)
                }}
                onKeyDown={handleKeyDown}
                disabled={isInteractionDisabled}
              />
              <button
                type="button"
                className="btn btn-primary btn-md shrink-0 px-4"
                onClick={() => void handleSendCode()}
                disabled={isInteractionDisabled || isCooldownActive}
              >
                {isSendingCode
                  ? '发送中...'
                  : isCooldownActive
                    ? `重新发送 (${cooldownSeconds}s)`
                    : '发送验证码'}
              </button>
            </div>
            {error ? <span className="text-xs text-error">{error}</span> : null}
          </label>
        </div>
      )}
    </Dialog>
  )
}
