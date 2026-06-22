import { useState, type FormEvent } from 'react'
import MdiLock from '~icons/mdi/lock'
import { useSWRConfig } from 'swr'
import type { FolderPasswordModalTarget } from '../../../../types'
import {
  FILE_FOLDER_TREE_ENDPOINT,
  isFileListKey,
  useVerifyFolderPasswordMutation,
} from '../../../hooks/useFilesApi'
import { cn } from '../../../utils/cn'
import {
  getFolderPasswordLengthError,
  normalizeFolderPassword,
} from '../../../utils/folderPassword'
import { saveFolderUnlockToken } from '../actions'

function getVerifyErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '密码验证失败'
}

export function FolderPasswordGate({ target }: { target: FolderPasswordModalTarget }) {
  const { mutate } = useSWRConfig()
  const { verifyFolderPassword, isMutating } = useVerifyFolderPasswordMutation()
  const [password, setPassword] = useState('')
  const [hasEditedPassword, setHasEditedPassword] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const normalizedPassword = normalizeFolderPassword(password)
  const passwordError = getFolderPasswordLengthError(password)
  const visibleError = verifyError ?? (hasEditedPassword ? passwordError : null)
  const isVerifyDisabled = isMutating || Boolean(passwordError)

  const refreshFileData = async () => {
    await mutate(key => isFileListKey(key) || key === FILE_FOLDER_TREE_ENDPOINT)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setHasEditedPassword(true)
    setVerifyError(null)

    if (!normalizedPassword) {
      setVerifyError('请输入访问密码')
      return
    }

    if (passwordError || isMutating) {
      return
    }

    try {
      const response = await verifyFolderPassword(target.path, normalizedPassword)
      saveFolderUnlockToken(response.protectedPath, response.unlockToken)
      setPassword('')
      setHasEditedPassword(false)
      await refreshFileData()
    } catch (error) {
      setVerifyError(getVerifyErrorMessage(error))
    }
  }

  return (
    <div className="rounded-box border border-base-300 bg-base-200/60 p-6 sm:p-8">
      <form
        className="mx-auto flex w-full max-w-md flex-col items-center gap-5"
        onSubmit={handleSubmit}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
          <MdiLock className="h-5 w-5" />
        </span>
        <div className="space-y-1 text-center">
          <h2 className="text-base font-semibold text-base-content">需要访问密码</h2>
        </div>
        <label className="flex w-full flex-col gap-1.5">
          <span className="text-xs font-semibold text-base-content/50">访问密码</span>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem]">
            <input
              type="password"
              className={cn(
                'input input-bordered input-sm h-9 min-h-9 w-full min-w-0',
                visibleError && 'input-error',
              )}
              value={password}
              autoComplete="current-password"
              onChange={event => {
                setPassword(event.target.value)
                setHasEditedPassword(false)
                setVerifyError(null)
              }}
              onBlur={event => {
                setHasEditedPassword(Boolean(normalizeFolderPassword(event.currentTarget.value)))
              }}
              disabled={isMutating}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm h-9 min-h-9 w-full shrink-0 px-4"
              disabled={isVerifyDisabled}
            >
              {isMutating ? <span className="loading loading-spinner" aria-hidden="true" /> : null}
              {isMutating ? '验证中...' : '验证'}
            </button>
          </div>
          {visibleError ? <span className="text-xs text-error">{visibleError}</span> : null}
        </label>
      </form>
    </div>
  )
}
