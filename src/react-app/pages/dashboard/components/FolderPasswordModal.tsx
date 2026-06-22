import { useRef, useState, type KeyboardEvent } from "react";
import toast from "react-hot-toast";
import { useSWRConfig } from "swr";
import { Dialog } from "../../../components/Dialog";
import {
  FILE_FOLDER_TREE_ENDPOINT,
  isFileListKey,
  useRemoveFolderPasswordMutation,
  useSetFolderPasswordMutation,
  useVerifyFolderPasswordMutation,
} from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import { cn } from "../../../utils/cn";
import {
  getFolderPasswordConfirmError,
  getFolderPasswordLengthError,
  normalizeFolderPassword,
} from "../../../utils/folderPassword";
import {
  closeFolderPasswordModal,
  requestDeleteTarget,
  requestRenameTarget,
  saveFolderUnlockToken,
} from "../actions";
import { useDashboardPath } from "../hooks/useDashboardPath";
import { requestMoveTargetWithFolderPreflight } from "../utils/folderMovePreflight";
import { shouldConfirmFromInputKey } from "../utils/modalKeyboard";

type FolderPasswordFormState = {
  password: string;
  confirmPassword: string;
  hasEditedPassword: boolean;
  hasVerifiedRemovePassword: boolean;
  passwordVerifyError: string | null;
};

function createInitialFormState(): FolderPasswordFormState {
  return {
    password: "",
    confirmPassword: "",
    hasEditedPassword: false,
    hasVerifiedRemovePassword: false,
    passwordVerifyError: null,
  };
}

export function FolderPasswordModal() {
  const { pendingFolderPasswordTarget } = useAppStore();
  const { mutate } = useSWRConfig();
  const { setPath } = useDashboardPath();
  const { setFolderPassword, isMutating: isSettingPassword } = useSetFolderPasswordMutation();
  const { verifyFolderPassword, isMutating: isVerifyingPassword } =
    useVerifyFolderPasswordMutation();
  const { removeFolderPassword, isMutating: isRemovingPassword } =
    useRemoveFolderPasswordMutation();
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const [formState, setFormState] = useState(createInitialFormState);

  const focusInputAfterOpen = () => {
    passwordInputRef.current?.focus();
    passwordInputRef.current?.select();
  };

  if (!pendingFolderPasswordTarget) {
    return null;
  }

  const target = pendingFolderPasswordTarget;
  const {
    confirmPassword,
    hasEditedPassword,
    hasVerifiedRemovePassword,
    password,
    passwordVerifyError,
  } = formState;
  const isBusy = isSettingPassword || isVerifyingPassword || isRemovingPassword;
  const normalizedPassword = normalizeFolderPassword(password);
  const passwordError =
    target.mode === "set"
      ? getFolderPasswordConfirmError(password, confirmPassword)
      : getFolderPasswordLengthError(password);
  const visiblePasswordError = hasEditedPassword ? passwordError : null;
  const visibleInputError = visiblePasswordError ?? passwordVerifyError;
  const title =
    target.mode === "set"
      ? "设置访问密码"
      : target.mode === "remove"
        ? "取消访问密码"
        : "验证访问密码";
  const confirmText =
    target.mode === "set"
      ? "设置密码"
      : target.mode === "remove" && hasVerifiedRemovePassword
        ? "取消密码"
        : "验证";
  const confirmPendingText =
    target.mode === "set"
      ? "设置中..."
      : target.mode === "remove" && hasVerifiedRemovePassword
        ? "取消中..."
        : "验证中...";
  const confirmDisabled =
    isBusy ||
    (target.mode === "remove" && hasVerifiedRemovePassword ? false : Boolean(passwordError));

  const resetState = () => {
    setFormState(createInitialFormState());
  };

  const refreshFileData = async () => {
    await mutate((key) => isFileListKey(key) || key === FILE_FOLDER_TREE_ENDPOINT);
  };

  const handleClose = () => {
    if (isBusy) {
      return;
    }

    const shouldReturnToParent =
      target.mode === "unlock" && !target.afterUnlock && target.returnPath !== undefined;
    const returnPath = target.returnPath ?? "";
    resetState();
    closeFolderPasswordModal(shouldReturnToParent ? target : null);
    if (shouldReturnToParent) {
      setPath(returnPath);
    }
  };

  const handleVerified = async (protectedPath: string, unlockToken: string) => {
    saveFolderUnlockToken(protectedPath, unlockToken);
    await refreshFileData();
  };

  const handleUnlock = async () => {
    const nextPath = target.afterUnlock || target.returnPath !== undefined ? null : target.path;
    const response = await verifyFolderPassword(target.path, normalizedPassword);
    await handleVerified(response.protectedPath, response.unlockToken);
    resetState();
    closeFolderPasswordModal();

    if (target.afterUnlock?.type === "rename") {
      requestRenameTarget(target.afterUnlock.target);
    } else if (target.afterUnlock?.type === "move") {
      await requestMoveTargetWithFolderPreflight(target.afterUnlock.target);
    } else if (target.afterUnlock?.type === "delete") {
      requestDeleteTarget(target.afterUnlock.target);
    } else if (nextPath !== null) {
      setPath(nextPath);
    }
  };

  const handleSetPassword = async () => {
    await setFolderPassword(target.path, normalizedPassword);
    await refreshFileData();
    toast.success(`已为 “${target.name}” 设置访问密码`);
    resetState();
    closeFolderPasswordModal();
  };

  const handleRemovePassword = async () => {
    if (!hasVerifiedRemovePassword) {
      const response = await verifyFolderPassword(target.path, normalizedPassword);
      await handleVerified(response.protectedPath, response.unlockToken);
      setFormState((state) => ({
        ...state,
        hasVerifiedRemovePassword: true,
        passwordVerifyError: null,
      }));
      toast.success("密码验证通过");
      return;
    }

    await removeFolderPassword(target.path);
    await refreshFileData();
    toast.success(`已取消 “${target.name}” 的访问密码`);
    resetState();
    closeFolderPasswordModal();
  };

  const handleConfirm = async () => {
    if (confirmDisabled) {
      return;
    }

    setFormState((state) => ({ ...state, passwordVerifyError: null }));
    try {
      if (target.mode === "set") {
        await handleSetPassword();
      } else if (target.mode === "remove") {
        await handleRemovePassword();
      } else {
        await handleUnlock();
      }
    } catch (error) {
      if (target.mode === "unlock" || (target.mode === "remove" && !hasVerifiedRemovePassword)) {
        setFormState((state) => ({
          ...state,
          passwordVerifyError: error instanceof Error ? error.message : "密码验证失败",
        }));
        return;
      }

      toast.error(error instanceof Error ? error.message : "密码操作失败");
    }
  };

  const handlePasswordKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      !shouldConfirmFromInputKey({
        key: event.key,
        isComposing: event.nativeEvent.isComposing,
      })
    ) {
      return;
    }

    event.preventDefault();
    void handleConfirm();
  };

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
      confirmButtonClassName={
        target.mode === "remove" && hasVerifiedRemovePassword
          ? "btn btn-sm btn-error text-error-content"
          : "btn btn-sm btn-primary"
      }
    >
      {({ isInteractionDisabled }) => (
        <div className="space-y-4">
          <p className="break-all text-sm leading-6 text-base-content/70">
            {target.mode === "set"
              ? `为 “${target.name}” 设置访问密码`
              : target.mode === "remove"
                ? hasVerifiedRemovePassword
                  ? `密码已验证，确认取消 “${target.name}” 的访问密码。`
                  : `先验证 “${target.name}” 的当前访问密码。`
                : `输入 “${target.name}” 的访问密码后继续访问。`}
          </p>

          {!hasVerifiedRemovePassword ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-base-content/50">访问密码</span>
              <input
                ref={passwordInputRef}
                type="password"
                className={cn("input input-bordered w-full", visibleInputError && "input-error")}
                value={password}
                autoComplete={target.mode === "set" ? "new-password" : "current-password"}
                onChange={(event) => {
                  setFormState((state) => ({
                    ...state,
                    hasEditedPassword: true,
                    password: event.target.value,
                    passwordVerifyError: null,
                  }));
                }}
                onKeyDown={handlePasswordKeyDown}
                disabled={isInteractionDisabled}
              />
              {visibleInputError ? (
                <span className="text-xs text-error">{visibleInputError}</span>
              ) : null}
            </label>
          ) : null}

          {target.mode === "set" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-base-content/50">确认密码</span>
              <input
                type="password"
                className={cn("input input-bordered w-full", visiblePasswordError && "input-error")}
                value={confirmPassword}
                autoComplete="new-password"
                onChange={(event) => {
                  setFormState((state) => ({
                    ...state,
                    confirmPassword: event.target.value,
                    hasEditedPassword: true,
                    passwordVerifyError: null,
                  }));
                }}
                onKeyDown={handlePasswordKeyDown}
                disabled={isInteractionDisabled}
              />
            </label>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
