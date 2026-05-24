---
name: react-atomic-store
description: 当需要在 React 项目中引入 react-atomic-store、查询 react-atomic-store 官方用法、创建 store、迁移组件状态、减少 props 透传、或用 react-atomic-store 重构 React 状态管理时使用。
---

# react-atomic-store

用于指导 Codex 在 React 项目中安全、渐进地引入 `react-atomic-store`，并按项目既有结构完成状态抽取、组件改造和验证。

## 1. 先确认官方来源

- 先查询 npm 包元数据：`npm view react-atomic-store --json`。
- 优先阅读 npm 元数据中的 `homepage`、`repository` 或 README，确认当前版本、导出 API、peerDependencies 和示例用法。
- 如果官方文档缺失或与本 skill 冲突，优先采用官方来源，并在回复中说明不确定点。
- 本 skill 的详细 API 说明放在 `references/apis.md`，重构建议放在 `references/refactor-guide.md`。
- 需要具体迁移样例时，阅读 `references/todo-list-migration.md`，它基于 `todo-list/src/todo-list` 和 `todo-list/src/todo-list-by-react-atomic-store` 的前后对比。

## 2. 接入大纲

1. 检查项目结构和现有状态管理方式。
   - 优先搜索 `useState`、`useReducer`、Context、props 透传和已有 store 文件。
   - 在本项目中，React 前端位于 `src/react-app/`。

2. 安装依赖。
   - 使用项目包管理器安装：`npm install react-atomic-store`。
   - 不要顺手替换无关依赖或改动 lockfile 之外的无关内容。

3. 设计 store 边界。
   - 只抽取真实共享的业务状态，局部 UI 状态继续留在组件内部。
   - 为每个 store 定义清晰名称和初始值对象。
   - 公共类型优先放到 `src/types.ts`，业务局部类型可贴近 store 文件。

4. 创建 store 模块。
   - 从 `react-atomic-store` 引入 `createStore`。
   - 导出 `useXxxStore`、`getXxxStoreMethods`、`subscribeXxxStore`。
   - store 初始值的每个属性用 `/** */` 注释说明用途。

5. 改造组件读取和更新方式。
   - 组件内响应式读取：使用 `useStore()` 解构需要响应的字段。
   - 组件内写入：使用自动生成的 `setXxx` 方法。
   - 组件外读写：使用 `getStoreMethods()`。
   - 订阅副作用：使用 `subscribeStore()`，并确保取消订阅。

6. 收敛 props。
   - 删除只用于传递业务状态和 setter 的中间 props。
   - 保留真正属于组件配置、布局、回调契约的 props。
   - 避免一次性迁移过大范围，优先按功能域小步替换。

7. 验证结果。
   - 至少运行类型检查或项目推荐检查命令。
   - 本项目优先运行 `npm run build`，必要时再运行 `npm run lint` 或 `npm run check`。
   - 涉及 UI 行为时，用真实浏览器打开 Vite dev server 验证关键流程。

## 3. 需要加载的参考文件

- 查询 API 和 TypeScript 用法：读 `references/apis.md`。
- 迁移现有 React 状态：读 `references/refactor-guide.md`。
- 需要 before/after 示例：读 `references/todo-list-migration.md`。
