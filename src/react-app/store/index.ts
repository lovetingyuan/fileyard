import { createStore } from 'react-atomic-store'
import type {
  DeleteTarget,
  FileEntry,
  NewTextFileDraft,
  RenameTarget,
  SortKey,
  SortOrder,
  ThemePreference,
  UploadQueueItem,
  User,
} from '../../types'

function getInitialThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  try {
    const stored = window.localStorage.getItem('theme-preference')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    return 'system'
  }

  return 'system'
}

export const { useStore, getStoreMethods, getStoreState, getStateSnapshot, subscribeStore } =
  createStore('app-store', {
    /** Better Auth 当前会话映射出的用户信息，未登录时为 null。 */
    userInfo: null as User | null,
    /** Better Auth 会话是否仍在读取中。 */
    authLoading: false,
    /** 登录、注册、退出等 Better Auth 操作是否正在执行。 */
    authMutating: false,
    /** 最近一次认证操作或会话读取产生的错误消息。 */
    authError: null as string | null,
    /** 用户选择的主题偏好，system 表示跟随系统外观。 */
    themePreference: getInitialThemePreference(),
    /** Dashboard 文件列表排序字段。 */
    dashboardSortKey: 'uploadedAt' as SortKey,
    /** Dashboard 文件列表排序方向。 */
    dashboardSortOrder: 'desc' as SortOrder,
    /** 搜索输入框当前正在编辑的内容。 */
    searchInputValue: '',
    /** 已提交给 Dashboard 文件列表过滤逻辑的搜索关键字。 */
    searchKeyword: '',
    /** 是否正在显示新建文件夹弹窗。 */
    isCreatingNewFolder: false,
    /** 新建文件夹请求是否正在提交。 */
    creatingFolder: false,
    /** 新建文件夹弹窗的默认文件夹名称。 */
    addNewFolderName: '',
    /** 正在新建文本文件的草稿内容；null 表示弹窗关闭。 */
    addNewTextFile: null as NewTextFileDraft | null,
    /** 当前正在进行新建或保存的文本文件上传操作。 */
    savingTextFile: false,
    /** 当前正在被预览、分享或查看详情的文件。 */
    currentFile: null as FileEntry | null,
    /** 是否正在展示文件预览弹窗。 */
    previewing: false,
    /** 是否正在执行文件下载请求。 */
    downloading: false,
    /** 当前正在下载的文件路径；null 表示没有下载任务。 */
    downloadingPath: null as string | null,
    /** 是否正在展示文件分享弹窗。 */
    sharing: false,
    /** 是否正在执行删除流程。 */
    deleting: false,
    /** 当前等待用户确认删除的文件或文件夹目标。 */
    pendingDeleteTarget: null as DeleteTarget | null,
    /** 当前等待用户输入新名称的文件或文件夹目标。 */
    pendingRenameTarget: null as RenameTarget | null,
    /** 当前正在删除的文件路径；null 表示没有文件删除任务。 */
    deletingFilePath: null as string | null,
    /** 当前正在删除的文件夹路径；null 表示没有文件夹删除任务。 */
    deletingFolderPath: null as string | null,
    /** 当前正在重命名的路径；null 表示没有重命名任务。 */
    renamingPath: null as string | null,
    /** 是否正在展示文件详情弹窗。 */
    viewDetail: false,
    /** 是否正在展示目录统计弹窗。 */
    isDirectoryStatsModalOpen: false,
    /** 当前目录统计弹窗要展示的目录路径。 */
    directoryStatsPath: '',
    /** 用户最近选择的上传入口类型，用于区分文件或文件夹上传。 */
    uploadType: '' as 'file' | 'folder' | '',
    /** 当前上传队列的可渲染任务列表。 */
    uploadQueue: [] as UploadQueueItem[],
    /** 上传进度面板是否处于折叠状态。 */
    isUploadPanelMinimized: false,
  })

export type AppStoreState = ReturnType<typeof getStoreState>
export type AppStoreMethods = ReturnType<typeof getStoreMethods>
export type AppStoreValue = AppStoreState & AppStoreMethods

export function useAppStore(): AppStoreValue {
  if (typeof document === 'undefined') {
    return {
      ...getStoreState(),
      ...getStoreMethods(),
    }
  }

  return useStore() as AppStoreValue
}
