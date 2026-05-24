import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MdiArrowLeft from '~icons/mdi/arrow-left'
import MdiGithub from '~icons/mdi/github'
import MdiLogout from '~icons/mdi/logout'
import toast from 'react-hot-toast'
import { UserAvatar } from '../../components/UserAvatar'
import { Dialog } from '../../components/Dialog'
import { useAuth } from '../../auth/useAuth'
import { useProfile, useUploadAvatar } from '../../hooks/useProfileApi'

const MAX_AVATAR_BYTES = 500 * 1024
const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const GITHUB_REPOSITORY_URL = 'https://github.com/lovetingyuan/fileyard'

type DrawableSource = {
  width: number
  height: number
  draw: (context: CanvasRenderingContext2D) => void
  dispose: () => void
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to convert image to PNG'))
        return
      }

      resolve(blob)
    }, 'image/png')
  })
}

async function createDrawableSource(file: File): Promise<DrawableSource> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: context => context.drawImage(bitmap, 0, 0),
      dispose: () => bitmap.close(),
    }
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Failed to read image'))
      element.src = objectUrl
    })

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: context => context.drawImage(image, 0, 0),
      dispose: () => URL.revokeObjectURL(objectUrl),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function convertImageToPng(file: File): Promise<Blob> {
  const source = await createDrawableSource(file)

  try {
    const canvas = document.createElement('canvas')
    canvas.width = source.width
    canvas.height = source.height

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas is not available')
    }

    source.draw(context)
    return await canvasToBlob(canvas)
  } finally {
    source.dispose()
  }
}

export function Profile() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isPreparingImage, setIsPreparingImage] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const { user, logout, loading: isAuthMutating } = useAuth()
  const { profile, isLoading } = useProfile()
  const { uploadAvatar, isMutating } = useUploadAvatar()

  const email = profile?.email ?? user?.email ?? ''
  const busy = isPreparingImage || isMutating

  const handleLogout = async () => {
    await logout()
  }

  const handleOpenLogoutConfirm = () => {
    if (isAuthMutating) {
      return
    }

    setIsLogoutConfirmOpen(true)
  }

  const handleCloseLogoutConfirm = () => {
    if (isAuthMutating) {
      return
    }

    setIsLogoutConfirmOpen(false)
  }

  const handleAvatarClick = () => {
    if (busy || isLoading) {
      return
    }

    inputRef.current?.click()
  }

  const handleUploadSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toast.error('头像仅支持 PNG、JPG、JPEG 或 WebP')
      return
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('原始图片不能超过 500KB')
      return
    }

    try {
      setIsPreparingImage(true)
      const pngBlob = await convertImageToPng(file)
      await uploadAvatar(pngBlob)
      toast.success('头像已更新')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '头像上传失败')
    } finally {
      setIsPreparingImage(false)
    }
  }

  return (
    <main className="mx-auto flex w-[96%] max-w-300 flex-1 flex-col gap-6 pt-6 md:w-[90%] md:p-8">
      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-ghost gap-2" onClick={() => navigate('/')}>
          <MdiArrowLeft className="h-5 w-5" />
          返回文件列表
        </button>
      </div>

      <section className="card bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">关于这个应用</h2>
            <a
              href={GITHUB_REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-circle btn-sm"
              aria-label="打开 GitHub 仓库"
            >
              <MdiGithub className="h-5 w-5" />
            </a>
          </div>
          <p className="leading-7 text-base-content/70">
            fileyard 是一个轻量文件管理应用，用来存储、浏览、上传、下载和分享你的个人文件。
          </p>
        </div>
      </section>

      <section className="card bg-base-100 shadow-sm">
        <div className="card-body gap-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadSelection}
                disabled={busy}
              />
              <div className="group tooltip tooltip-top tooltip-info shrink-0">
                <div className="tooltip-content">
                  <span className="inline-block max-w-45 text-xs">
                    头像要求：支持 PNG、JPG、JPEG、WebP，原图不超过 500KB
                  </span>
                </div>
                <button
                  type="button"
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring ring-base-300 ring-offset-4 ring-offset-base-100 transition disabled:cursor-not-allowed"
                  onClick={handleAvatarClick}
                  disabled={busy || isLoading}
                  aria-label="更换头像"
                >
                  <UserAvatar
                    email={email}
                    avatarUrl={profile?.avatarUrl}
                    authImage={user?.image}
                    className="h-full w-full"
                    textClassName="text-xl"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-base-content/65 text-xs font-medium text-base-100 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {busy ? '处理中...' : '更换头像'}
                  </span>
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-base font-medium break-all">{email || '加载中...'}</p>
              </div>
            </div>

            <div className="self-end md:self-auto">
              <button
                type="button"
                className={`btn btn-ghost btn-sm gap-2 ${isAuthMutating ? 'loading' : ''}`}
                onClick={handleOpenLogoutConfirm}
                disabled={isAuthMutating}
                aria-haspopup="dialog"
                aria-expanded={isLogoutConfirmOpen}
              >
                {!isAuthMutating && <MdiLogout className="h-4 w-4" />}
                退出登录
              </button>
            </div>
          </div>
        </div>
      </section>

      <Dialog
        isOpen={isLogoutConfirmOpen}
        title="退出登录"
        onClose={handleCloseLogoutConfirm}
        onConfirm={handleLogout}
        confirmText="确认退出"
        confirmPendingText="退出中..."
        isDismissDisabled={isAuthMutating}
        boxClassName="max-w-md border border-error/10 bg-base-100"
        closeButtonAriaLabel="关闭退出确认弹窗"
        confirmButtonClassName="btn btn-sm btn-error text-error-content"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/12 text-error">
            <MdiLogout className="h-5 w-5" />
          </span>
          <p className="text-sm leading-6 text-base-content/70">
            确认退出当前账号吗？退出后需要重新登录才能继续访问你的文件。
          </p>
        </div>
      </Dialog>
    </main>
  )
}
