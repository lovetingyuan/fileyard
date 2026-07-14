import { useRef, useState, type KeyboardEvent } from 'react'
import toast from 'react-hot-toast'
import { useSWRConfig } from 'swr'
import { Dialog } from '../../../components/Dialog'
import {
  FILE_FOLDER_TREE_ENDPOINT,
  isFileListKey,
  useRemoveFolderPasswordMutation,
  useSetFolderPasswordMutation,
  useVerifyFolderPasswordMutation,
} from '../../../hooks/useFilesApi'
import { useAppStore } from '../../../store'
import {
  getFolderPasswordConfirmError,
  getFolderPasswordLengthError,
  normalizeFolderPassword,
} from '../../../utils/folderPassword'
import {
  closeFolderPasswordModal,
  requestDeleteTarget,
  requestRenameTarget,
  saveFolderUnlockToken,
} from '../actions'
import { downloadDashboardArchive, getDashboardArchiveFallbackName } from '../fileOperations'
import { useDashboardPath } from '../hooks/useDashboardPath'
import { requestMoveTargetWithFolderPreflight } from '../utils/folderMovePreflight'
import { ensureFolderSubtreesUnlockedBeforeOperation } from '../utils/folderSubtreeProtectionPreflight'
import { shouldConfirmFromInputKey } from '../utils/modalKeyboard'
import { FolderPasswordFormFields } from './FolderPasswordFormFields'
import { FolderPasswordRecoveryDialog } from './FolderPasswordRecoveryDialog'
import { getFolderPasswordModalCopy } from './folderPasswordModalCopy'

type FolderPasswordFormState = {
  password: string
  confirmPassword: string
  hasEditedPassword: boolean
  hasVerifiedRemovePassword: boolean
  passwordVerifyError: string | null
}

function createInitialFormState(): FolderPasswordFormState {
  return {
    password: '',
    confirmPassword: '',
    hasEditedPassword: false,
    hasVerifiedRemovePassword: false,
    passwordVerifyError: null,
  }
}

export function FolderPasswordModal() {
  const { pendingFolderPasswordTarget } = useAppStore()
  const { mutate } = useSWRConfig()
  const { setPath } = useDashboardPath()
  const { setFolderPassword, isMutating: isSettingPassword } = useSetFolderPasswordMutation()
  const { verifyFolderPassword, isMutating: isVerifyingPassword } =
    useVerifyFolderPasswordMutation()
  const { removeFolderPassword, isMutating: isRemovingPassword } = useRemoveFolderPasswordMutation()
  const passwordInputRef = useRef<HTMLInputElement | null>(null)
  const [formState, setFormState] = useState(createInitialFormState)
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false)

  const focusInputAfterOpen = () => {
    passwordInputRef.current?.focus()
    passwordInputRef.current?.select()
  }

  if (!pendingFolderPasswordTarget) {
    return null
  }

  const target = pendingFolderPasswordTarget
  const {
    confirmPassword,
    hasEditedPassword,
    hasVerifiedRemovePassword,
    password,
    passwordVerifyError,
  } = formState
  const isBusy = isSettingPassword || isVerifyingPassword || isRemovingPassword
  const normalizedPassword = normalizeFolderPassword(password)
  const passwordError =
    target.mode === 'set'
      ? getFolderPasswordConfirmError(password, confirmPassword)
      : getFolderPasswordLengthError(password)
  const visiblePasswordError = hasEditedPassword ? passwordError : null
  const visibleInputError = visiblePasswordError ?? passwordVerifyError
  const { title, confirmText, confirmPendingText, description, confirmButtonClassName } =
    getFolderPasswordModalCopy(target, hasVerifiedRemovePassword)
  const confirmDisabled =
    isBusy ||
    (target.mode === 'remove' && hasVerifiedRemovePassword ? false : Boolean(passwordError))

  const resetState = () => {
    setFormState(createInitialFormState())
  }

  const refreshFileData = async () => {
    await mutate(key => isFileListKey(key) || key === FILE_FOLDER_TREE_ENDPOINT)
  }

  const handleStartPasswordRecovery = () => {
    setIsRecoveryOpen(true)
  }

  const handleClose = () => {
    if (isBusy) {
      return
    }

    const shouldReturnToParent =
      target.mode === 'unlock' && !target.afterUnlock && target.returnPath !== undefined
    const returnPath = target.returnPath ?? ''
    resetState()
    setIsRecoveryOpen(false)
    closeFolderPasswordModal(shouldReturnToParent ? target : null)
    if (shouldReturnToParent) {
      setPath(returnPath)
    }
  }

  if (isRecoveryOpen) {
    return (
      <FolderPasswordRecoveryDialog
        target={target}
        onClose={() => setIsRecoveryOpen(false)}
        onRecovered={() => {
          resetState()
          setIsRecoveryOpen(false)
          closeFolderPasswordModal()
        }}
      />
    )
  }

  const handleVerified = async (protectedPath: string, unlockToken: string) => {
    saveFolderUnlockToken(protectedPath, unlockToken)
    await refreshFileData()
  }

  const handleUnlock = async () => {
    const nextPath = target.afterUnlock || target.returnPath !== undefined ? null : target.path
    const response = await verifyFolderPassword(target.path, normalizedPassword)
    await handleVerified(response.protectedPath, response.unlockToken)
    resetState()
    closeFolderPasswordModal()

    if (target.afterUnlock?.type === 'rename') {
      if (await ensureFolderSubtreesUnlockedBeforeOperation([target.afterUnlock.target])) {
        requestRenameTarget(target.afterUnlock.target)
      }
    } else if (target.afterUnlock?.type === 'move') {
      await requestMoveTargetWithFolderPreflight(target.afterUnlock.target)
    } else if (target.afterUnlock?.type === 'delete') {
      if (await ensureFolderSubtreesUnlockedBeforeOperation([target.afterUnlock.target])) {
        requestDeleteTarget(target.afterUnlock.target)
      }
    } else if (target.afterUnlock?.type === 'download') {
      await downloadDashboardArchive(
        target.afterUnlock.targets,
        getDashboardArchiveFallbackName(target.afterUnlock.targets),
      )
    } else if (nextPath !== null) {
      setPath(nextPath)
    }
  }

  const handleSetPassword = async () => {
    await setFolderPassword(target.path, normalizedPassword)
    await refreshFileData()
    toast.success(`已为 “${target.name}” 设置访问密码`)
    resetState()
    closeFolderPasswordModal()
  }

  const handleRemovePassword = async () => {
    if (!hasVerifiedRemovePassword) {
      const response = await verifyFolderPassword(target.path, normalizedPassword)
      await handleVerified(response.protectedPath, response.unlockToken)
      setFormState(state => ({
        ...state,
        hasVerifiedRemovePassword: true,
        passwordVerifyError: null,
      }))
      return
    }

    await removeFolderPassword(target.path)
    await refreshFileData()
    toast.success(`已取消 “${target.name}” 的访问密码`)
    resetState()
    closeFolderPasswordModal()
  }

  const handleConfirm = async () => {
    if (confirmDisabled) {
      return
    }

    setFormState(state => ({ ...state, passwordVerifyError: null }))
    try {
      if (target.mode === 'set') {
        await handleSetPassword()
      } else if (target.mode === 'remove') {
        await handleRemovePassword()
      } else {
        await handleUnlock()
      }
    } catch (error) {
      if (target.mode === 'unlock' || (target.mode === 'remove' && !hasVerifiedRemovePassword)) {
        setFormState(state => ({
          ...state,
          passwordVerifyError: error instanceof Error ? error.message : '密码验证失败',
        }))
        return
      }

      toast.error(error instanceof Error ? error.message : '密码操作失败')
    }
  }

  const handlePasswordKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
      title={title}
      onClose={handleClose}
      onConfirm={handleConfirm}
      onAfterOpen={focusInputAfterOpen}
      confirmText={confirmText}
      confirmPendingText={confirmPendingText}
      confirmDisabled={confirmDisabled}
      confirmLoading={isBusy}
      isDismissDisabled={isBusy}
      boxClassName="max-w-md border border-base-300/70 bg-base-100"
      closeButtonAriaLabel="关闭文件夹密码弹窗"
      confirmButtonClassName={confirmButtonClassName}
    >
      {({ isInteractionDisabled }) => (
        <div className="space-y-4">
          <p className="break-all text-sm leading-6 text-base-content/70">{description}</p>

          <FolderPasswordFormFields
            mode={target.mode}
            password={password}
            confirmPassword={confirmPassword}
            visibleInputError={visibleInputError}
            visiblePasswordError={visiblePasswordError}
            hasVerifiedRemovePassword={hasVerifiedRemovePassword}
            isInteractionDisabled={isInteractionDisabled}
            passwordInputRef={passwordInputRef}
            onPasswordChange={nextPassword => {
              setFormState(state => ({
                ...state,
                hasEditedPassword: true,
                password: nextPassword,
                passwordVerifyError: null,
              }))
            }}
            onConfirmPasswordChange={nextConfirmPassword => {
              setFormState(state => ({
                ...state,
                confirmPassword: nextConfirmPassword,
                hasEditedPassword: true,
                passwordVerifyError: null,
              }))
            }}
            onPasswordKeyDown={handlePasswordKeyDown}
            onStartRecovery={handleStartPasswordRecovery}
          />
        </div>
      )}
    </Dialog>
  )
}
