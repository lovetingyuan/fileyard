import MdiCloseCircleOutline from '~icons/mdi/close-circle-outline'
import MdiClose from '~icons/mdi/close'
import MdiChevronDown from '~icons/mdi/chevron-down'
import MdiChevronUp from '~icons/mdi/chevron-up'
import type { UploadQueueItem } from '../../types'
import type { UploadQueuePanelState } from '../hooks/useUploadQueue'
import { UploadProgressRow } from './UploadProgressRow'

interface UploadProgressPanelProps {
  items: UploadQueueItem[]
  panelState: UploadQueuePanelState
  isMinimized: boolean
  onMinimize: () => void
  onRestore: () => void
  onCancel: (id: string) => void
  onRetry: (id: string) => void
  onCancelAll: () => void
  onClose: () => void
}

const HIDDEN_LIST_STATUSES = new Set(['success', 'canceled'])

function getPanelTitle(items: UploadQueueItem[], panelState: UploadQueuePanelState): string {
  if (panelState.isComplete) {
    return panelState.hasTerminalIssues ? '上传已结束' : '上传完成'
  }
  if (items.length === 1) {
    return items[0]?.name ?? '上传中'
  }
  return '上传文件'
}

function getPanelSubtitle(panelState: UploadQueuePanelState): string {
  const segments = [`${panelState.completed}/${panelState.total} 已完成`]
  if (panelState.remaining > 0) {
    segments.push(`${panelState.remaining} 个进行中`)
  }
  if (panelState.failed > 0) {
    segments.push(`${panelState.failed} 个失败`)
  }
  if (panelState.canceled > 0) {
    segments.push(`${panelState.canceled} 个已取消`)
  }
  return segments.join(' · ')
}

function getPanelSubtitleClassName(panelState: UploadQueuePanelState): string {
  if (!panelState.isComplete) {
    return 'min-w-0 truncate text-xs text-base-content/60'
  }
  return `min-w-0 truncate text-xs ${panelState.hasTerminalIssues ? 'text-error' : 'text-success'}`
}

export function UploadProgressPanel({
  items,
  panelState,
  isMinimized,
  onMinimize,
  onRestore,
  onCancel,
  onRetry,
  onCancelAll,
  onClose,
}: UploadProgressPanelProps) {
  if (!panelState.shouldShowPanel) {
    return null
  }

  const totalProgress = Math.max(0, Math.min(100, Math.round(panelState.totalProgress)))
  const visibleItems = items.filter(item => !HIDDEN_LIST_STATUSES.has(item.status))
  const canClose = panelState.isComplete

  if (isMinimized) {
    return (
      <aside
        className="fixed right-4 bottom-4 z-50 w-[min(16rem,calc(100vw-2rem))] rounded-box border border-base-300 bg-base-100 p-3 text-base-content shadow-2xl"
        aria-label="上传进度"
      >
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className="min-w-0 flex-1 truncate text-sm font-semibold"
              title={getPanelTitle(items, panelState)}
            >
              {getPanelTitle(items, panelState)}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <div className="tooltip tooltip-left" data-tip="展开">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={onRestore}
                  aria-label="展开上传进度面板"
                >
                  <MdiChevronUp className="h-4 w-4" />
                </button>
              </div>
              {canClose ? (
                <div className="tooltip tooltip-left" data-tip="关闭">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square"
                    onClick={onClose}
                    aria-label="关闭上传进度面板"
                  >
                    <MdiClose className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className={getPanelSubtitleClassName(panelState)}>
              {getPanelSubtitle(panelState)}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{totalProgress}%</span>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="fixed right-4 bottom-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-box border border-base-300 bg-base-100 p-3 text-base-content shadow-2xl"
      aria-label="上传进度"
    >
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p
            className="min-w-0 flex-1 truncate text-sm font-semibold"
            title={getPanelTitle(items, panelState)}
          >
            {getPanelTitle(items, panelState)}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            {panelState.canCancelAll ? (
              <button
                type="button"
                className="btn btn-error btn-outline btn-xs"
                onClick={onCancelAll}
              >
                <MdiCloseCircleOutline className="h-4 w-4" />
                全部取消
              </button>
            ) : null}
            <div className="tooltip tooltip-left ml-5" data-tip="折叠">
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square"
                onClick={onMinimize}
                aria-label="折叠上传进度面板"
              >
                <MdiChevronDown className="h-4 w-4" />
              </button>
            </div>
            {canClose ? (
              <div className="tooltip tooltip-left" data-tip="关闭">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={onClose}
                  aria-label="关闭上传进度面板"
                >
                  <MdiClose className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mx-2 mt-2">
          <p className={getPanelSubtitleClassName(panelState)} title={getPanelSubtitle(panelState)}>
            {getPanelSubtitle(panelState)}
          </p>
          <span className="shrink-0 text-sm font-semibold tabular-nums">{totalProgress}%</span>
        </div>
      </div>

      {visibleItems.length > 0 ? (
        <ul className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
          {visibleItems.map(item => (
            <UploadProgressRow key={item.id} item={item} onCancel={onCancel} onRetry={onRetry} />
          ))}
        </ul>
      ) : null}
    </aside>
  )
}
