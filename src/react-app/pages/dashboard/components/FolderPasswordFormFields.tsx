import type { KeyboardEvent, RefObject } from 'react'
import type { FolderPasswordModalTarget } from '../../../../types'
import { cn } from '../../../utils/cn'

type FolderPasswordFormFieldsProps = {
  mode: FolderPasswordModalTarget['mode']
  password: string
  confirmPassword: string
  visibleInputError: string | null
  visiblePasswordError: string | null
  hasVerifiedRemovePassword: boolean
  isInteractionDisabled: boolean
  passwordInputRef: RefObject<HTMLInputElement | null>
  onPasswordChange: (password: string) => void
  onConfirmPasswordChange: (password: string) => void
  onPasswordKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onStartRecovery: () => void
}

export function FolderPasswordFormFields({
  mode,
  password,
  confirmPassword,
  visibleInputError,
  visiblePasswordError,
  hasVerifiedRemovePassword,
  isInteractionDisabled,
  passwordInputRef,
  onPasswordChange,
  onConfirmPasswordChange,
  onPasswordKeyDown,
  onStartRecovery,
}: FolderPasswordFormFieldsProps) {
  return (
    <>
      {!hasVerifiedRemovePassword ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-base-content/50">访问密码</span>
          <input
            ref={passwordInputRef}
            type="password"
            className={cn('input w-full', visibleInputError && 'input-error')}
            value={password}
            autoComplete={mode === 'set' ? 'new-password' : 'current-password'}
            onChange={event => onPasswordChange(event.target.value)}
            onKeyDown={onPasswordKeyDown}
            disabled={isInteractionDisabled}
          />
          {visibleInputError ? <span className="text-xs text-error">{visibleInputError}</span> : null}
        </label>
      ) : null}

      {mode === 'remove' && !hasVerifiedRemovePassword ? (
        <button
          type="button"
          className="btn btn-link btn-sm h-auto min-h-0 self-start px-0 text-base-content/70"
          onClick={onStartRecovery}
          disabled={isInteractionDisabled}
        >
          忘记密码？
        </button>
      ) : null}

      {mode === 'set' ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-base-content/50">确认密码</span>
          <input
            type="password"
            className={cn('input w-full', visiblePasswordError && 'input-error')}
            value={confirmPassword}
            autoComplete="new-password"
            onChange={event => onConfirmPasswordChange(event.target.value)}
            onKeyDown={onPasswordKeyDown}
            disabled={isInteractionDisabled}
          />
        </label>
      ) : null}
    </>
  )
}
