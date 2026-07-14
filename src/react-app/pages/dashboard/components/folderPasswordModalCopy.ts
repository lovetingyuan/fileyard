import type { FolderPasswordModalTarget } from '../../../../types'

export function getFolderPasswordModalCopy(
  target: FolderPasswordModalTarget,
  hasVerifiedRemovePassword: boolean,
) {
  if (target.mode === 'set') {
    return {
      title: '设置访问密码',
      confirmText: '设置密码',
      confirmPendingText: '设置中...',
      description: `为 “${target.name}” 设置访问密码`,
      confirmButtonClassName: 'btn btn-sm btn-primary',
    }
  }

  if (target.mode === 'remove') {
    return hasVerifiedRemovePassword
      ? {
          title: '取消访问密码',
          confirmText: '取消密码',
          confirmPendingText: '取消中...',
          description: `密码已验证，确认取消 “${target.name}” 的访问密码。`,
          confirmButtonClassName: 'btn btn-sm btn-error text-error-content',
        }
      : {
          title: '取消访问密码',
          confirmText: '验证',
          confirmPendingText: '验证中...',
          description: `先验证 “${target.name}” 的当前访问密码。`,
          confirmButtonClassName: 'btn btn-sm btn-primary',
        }
  }

  return {
    title: '验证访问密码',
    confirmText: '验证',
    confirmPendingText: '验证中...',
    description: `输入 “${target.name}” 的访问密码后继续访问。`,
    confirmButtonClassName: 'btn btn-sm btn-primary',
  }
}
