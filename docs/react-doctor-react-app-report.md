# React App React Doctor Report

生成日期：2026-07-04

## 范围与依据

- 检查范围：`src/react-app/**`
- 运行命令：`npx -y react-doctor@latest --json --yes`
- React Doctor：`0.7.1`
- 项目识别：React `19.2.1`、Vite、TypeScript、React Compiler 已启用
- 过滤规则：排除 `.worktrees/**`、`src/admin-app/**`、根目录和 Worker 目录；未发现 `.react-doctor/false-positives.md`

React Doctor 对全仓库返回 exit code 1，但 JSON 中 `ok: true`；这表示扫描成功且仍存在诊断项。

## 本次修复状态

| 指标 | 修复前 | 修复后 |
| --- | ---: | ---: |
| 诊断总数 | 80 | 52 |
| Error | 22 | 14 |
| Warning | 58 | 38 |
| 受影响文件 | 36 | 26 |
| Accessibility | 23 | 17 |
| Bugs | 2 | 2 |
| Maintainability | 12 | 12 |
| Performance | 38 | 16 |
| Security | 5 | 5 |

## 已修复

| 规则 | 修复结果 | 说明 |
| --- | ---: | --- |
| `react-hooks-js/refs` | 8 -> 0 | `Login` query toast 移入 `useEffect`；`useUploadUnloadProtection` 只在 effect 内创建 beforeunload protection；文件定位高亮由组件持有 DOM ref；上传队列 processor 不再在 render 阶段写 `processQueueRef.current` |
| `react-doctor/rerender-lazy-ref-init` | 6 -> 0 | `useUploadQueue` / `useUploadQueueProcessor` 中的 `Set`、`Map`、`PQueue`、folder ensureer 改为 lazy ref 初始化 |
| `react-doctor/js-combine-iterations` | 6 -> 0 | 上传选择、剪贴板上传、拖放上传、上传进度展示、失败选择回填等明确等价的多次数组遍历已合并 |
| `react-doctor/js-flatmap-filter` | 2 -> 0 | `uploadProgressDisplay.ts`、`uploadSelection.ts` 中的 map/filter 组合已改为单次遍历 |
| `react-doctor/dialog-has-accessible-name` | 1 -> 0 | `Dialog` 为已有 `title` 的弹窗补 `aria-labelledby` 和稳定标题 id |
| `react-doctor/label-has-associated-control` | 2 -> 0 | `NewTextFileModal` 的文件名 input、内容 textarea 已建立 `label htmlFor` / `id` 关联 |
| `react-doctor/control-has-associated-label` | 8 -> 5 | `NewTextFileModal` 两个控件和 `PreviewText` 编辑 textarea 已补可访问名称；`DashboardFileList` 的 5 个控件仍保留 |

## 剩余诊断汇总

| 规则 | 数量 | 处理判断 |
| --- | ---: | --- |
| `react-hooks-js/todo` | 13 | 需要逐个确认 async cleanup、导航、toast 和队列清理语义，不做机械重写 |
| `react-hooks-js/set-state-in-effect` | 1 | `FileTreeSidebar` 的状态迁移会影响展开交互，需要产品行为确认 |
| `react-doctor/control-has-associated-label` | 5 | 仅剩 `DashboardFileList` 图标控件；需要确认具体可访问名称文案 |
| `react-doctor/click-events-have-key-events` | 4 | 涉及 Dropdown 和文件网格项交互语义，可能影响选择/打开行为 |
| `react-doctor/prefer-tag-over-role` | 6 | 需要改 DOM 结构，可能影响 DaisyUI/Tailwind 样式和列表布局 |
| `react-doctor/no-noninteractive-element-interactions` | 2 | 与 Dropdown 结构调整绑定处理 |
| `react-doctor/dangerous-html-sink` | 1 | 需要 HTML sanitization 安全方案 |
| `react-doctor/iframe-missing-sandbox` | 1 | 需要确认 PDF 预览最小 sandbox 权限 |
| `react-doctor/no-secrets-in-client-code` | 3 | API path 常量疑似误报；可建 false-positive 或改名，但需要约定 |
| `react-hooks-js/exhaustive-deps` | 1 | `UploadProgressPanel` toast 触发条件需避免重复提示 |
| 维护性规则 | 12 | 包含 only-export-components、unused-export、no-giant-component、no-multi-comp、no-many-boolean-props、circular-dependency；均不是无副作用机械修复 |
| `react-doctor/async-defer-await` | 2 | 需要确认 early-return 与取消/导航语义 |
| `react-doctor/prefer-useReducer` | 1 | 状态模型重构，超出低风险范围 |

## P0 / Error

### React Compiler 无法优化 `try/finally`

规则：`react-hooks-js/todo`

| 位置 | 现象 | 修复建议 |
| --- | --- | --- |
| `src/react-app/auth/useAuth.ts:74` | `logout` 使用 `try/catch/finally` | 保留 `catch`，把 `setAuthMutating(false)` 移到统一收尾路径；注意 `window.location.assign("/")` 的 early return 语义 |
| `src/react-app/components/Dialog.tsx:141` | `confirm` 使用 `try/finally` | 需要确认失败时是否保持弹窗、loading 和错误传播语义 |
| `src/react-app/hooks/useAuthApi.ts:55` | `useAsyncMutation` 用 `finally` 复位 | 将 mutation runner 改成无 `finally` 的状态机，并补测试 |
| `src/react-app/pages/ShareDownload.tsx:125` | 下载流程使用 `finally` | 需要确认下载失败、取消和 busy cleanup 语义 |
| `src/react-app/pages/dashboard/components/BatchDeleteConfirmModal.tsx:81` | batch delete handler 使用 `finally` | 同上，涉及 toast/error 语义 |
| `src/react-app/pages/dashboard/components/BatchMoveModal.tsx:114` | batch move handler 使用 `finally` | 同上 |
| `src/react-app/pages/dashboard/components/ClipboardUploadButton.tsx:138` | clipboard upload handler 使用 `finally` | 同上 |
| `src/react-app/pages/dashboard/components/DeleteConfirmModal.tsx:40` | file delete handler 使用 `finally` | 同上 |
| `src/react-app/pages/dashboard/components/DeleteConfirmModal.tsx:55` | folder delete handler 使用 `finally` | 同上 |
| `src/react-app/pages/dashboard/components/MoveModal.tsx:70` | move handler 使用 `finally` | 同上 |
| `src/react-app/pages/dashboard/components/NewTextFileModal.tsx:33` | create text file handler 使用 `finally` | 同上 |
| `src/react-app/pages/dashboard/hooks/useUploadQueueProcessor.ts:69` | upload worker 使用 `try/finally` | 队列清理路径复杂，需要专门测试成功、失败、取消、重试和 close panel |
| `src/react-app/pages/profile/Profile.tsx:147` | profile update handler 使用 `finally` | 需要确认保存失败和 UI 复位语义 |

### effect 内同步 setState

规则：`react-hooks-js/set-state-in-effect`

| 位置 | 问题 | 排除原因 |
| --- | --- | --- |
| `src/react-app/pages/dashboard/components/FileTreeSidebar.tsx:331` | effect 内同步 `setOpenPaths`，会导致额外 render | 这可能是“路径变化时自动展开”的交互状态，不应在没有产品决策时改成派生状态 |

## P1 / Security

| 规则 | 位置 | 问题 | 排除原因 |
| --- | --- | --- | --- |
| `react-doctor/dangerous-html-sink` | `src/react-app/components/TopBanner.tsx:52` | `banner.contentHtml` 直接传入 `dangerouslySetInnerHTML` | 需要确定允许标签/属性、sanitizer 位置和存量数据策略 |
| `react-doctor/iframe-missing-sandbox` | `src/react-app/pages/dashboard/components/preview/PreviewPdf.tsx:65` | PDF blob iframe 未设置 `sandbox` | 需要验证 PDF 预览所需最小权限，避免功能回归 |
| `react-doctor/no-secrets-in-client-code` | `src/react-app/hooks/filesApiUrls.ts:13,14,15` | 公开 API path 常量被识别为 secret | 疑似误报；是否新增 false-positive 文件或改名需要团队约定 |

## P1 / Accessibility

| 规则 | 位置 | 修复建议 |
| --- | --- | --- |
| `control-has-associated-label` | `src/react-app/pages/dashboard/components/DashboardFileList.tsx:58,59,65,68,71` | 给图标按钮/控件添加真实可访问名称；文案需与按钮实际命令一致 |
| `click-events-have-key-events` | `src/react-app/components/Dropdown.tsx:96,122`; `src/react-app/pages/dashboard/components/FileGridItems.tsx:93,180` | 把交互容器改成原生交互元素，或补齐键盘语义；需验证选择/打开行为 |
| `no-noninteractive-element-interactions` | `src/react-app/components/Dropdown.tsx:96,122` | 不要把 click 放在非交互 `<ul>` 上；需和 Dropdown DOM 结构一起调整 |
| `prefer-tag-over-role` | `src/react-app/components/Dropdown.tsx:114`; `ClipboardUploadButton.tsx:103`; `DashboardFileList.tsx:253,266`; `FileGridItems.tsx:95,188` | 改用原生语义标签，但需确认样式和布局不变 |

## P1 / Bugs

| 规则 | 位置 | 问题 | 修复建议 |
| --- | --- | --- | --- |
| `exhaustive-deps` | `src/react-app/pages/dashboard/components/UploadProgressPanel.tsx:111` | effect 缺少依赖，可能读到过期闭包 | 补齐依赖前需要确认不会重复 toast；建议先把 toast 触发条件提炼成稳定状态转移 |
| `prefer-useReducer` | `src/react-app/pages/dashboard/components/PreviewModal.tsx:47` | 多个相关 `useState` 分散维护 | 状态模型重构，适合单独处理 |

## P2 / Performance And Maintainability

| 规则 | 位置 | 修复建议 |
| --- | --- | --- |
| `async-defer-await` | `src/react-app/auth/useAuth.ts:75`; `src/react-app/pages/dashboard/hooks/useUploadQueueProcessor.ts:70` | 只有确认 early-return、取消和导航语义不变后再移动 await |
| `circular-dependency` | `src/react-app/pages/dashboard/utils/fileTreeSidebarState.ts` -> `src/react-app/utils/folderUnlockTokens.ts` -> `src/react-app/store/index.ts` | 把共享纯函数或类型抽到第三个无 store 依赖模块 |
| `no-giant-component` | `src/react-app/pages/dashboard/components/ShareFileModal.tsx:47` | 拆分真实子视图或状态块，不做顺手重构 |
| `no-many-boolean-props` | `src/react-app/components/Dialog.tsx:80` | 将 boolean 组合改成命名 variant 或拆具体组件 |
| `no-multi-comp` | `src/react-app/pages/dashboard/components/preview/PreviewMedia.tsx:159,180` | 将独立组件移动到单独文件 |
| `only-export-components` | `ClipboardUploadButton.tsx:66,86`; `FileTreeSidebar.tsx:34`; `routes.tsx:14,22` | 将非组件 export 移到 `.ts` helper 文件 |
| `unused-export` | `src/react-app/routes.tsx:18`; `src/react-app/utils/fileFormatters.ts:51` | 先确认不是动态入口，再删除 export 或函数 |

## 验证结果

| 命令 | 结果 |
| --- | --- |
| `npm run build` | 通过；仍有既有 `BETTER_AUTH_SECRET` 缺失提示和 CSS `::highlight(...)` 构建 warning |
| `npx tsc -p tsconfig.worker.json --noEmit` | 通过 |
| `npx -y react-doctor@latest --json --yes` | 扫描成功但 exit code 1；`src/react-app/**` 剩 52 条诊断 |
| `npm test -- --run test/react-app test/worker` | 失败 1 个未修改测试：`test/react-app/pages/dashboard/utils/fileTreeSidebarState.test.ts:15` 期望 `w-12`，实际 `w-0` |

未做浏览器验证：用户已明确说明改完后无需浏览器验证。
