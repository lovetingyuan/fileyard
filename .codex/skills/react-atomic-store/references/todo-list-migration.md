# Todo List 迁移示例

示例代码位置：

- 传统版本：`todo-list/src/todo-list`
- react-atomic-store 版本：`todo-list/src/todo-list-by-react-atomic-store`

这个示例展示的核心迁移路径是：从“顶层组件集中持有状态并向下传 props”，迁移到“领域 store 持有共享业务状态，领域函数封装业务操作，组件就近读取自己需要的数据”。

## 迁移前的问题

传统版本的 `App.tsx` 同时负责：

- 初始化和持久化 `todos`。
- 持有 `newTodoText`、`filter`、`editingTodoId`、`editingText`。
- 计算 `filteredTodos`、`activeCount`、`completedCount`。
- 定义 `addTodo`、`toggleTodo`、`deleteTodo`、`saveEditing` 等所有业务函数。
- 把状态和回调传给 `AddTodoForm`、`TodoFilters`、`TodoList`、`TodoItem`、`ClearCompletedButton`。

这会让 `App` 变成状态中转站。`TodoList` 和 `TodoItem` 接收大量 props，其中很多只是为了把业务函数继续传给更深层组件。

## 状态分类

| 迁移前状态 | 迁移后位置 | 原因 |
| --- | --- | --- |
| `todos` | store | 多个组件读取，多个业务操作更新，并需要持久化 |
| `filter` | store | 过滤导航和列表都需要读取 |
| `editingTodoId` | store | 列表项需要判断自己是否正在编辑，删除操作也要读取 |
| `newTodoText` | `AddTodoForm` 内部 state | 只属于新增表单的输入草稿 |
| `editingText` | `TodoItemEditor` 内部 state | 只属于当前编辑输入框的临时草稿 |
| `filteredTodos` | `useFilteredTodos()` | 可由 `todos` 和 `filter` 派生 |
| `activeCount`、`completedCount` | 使用处就近计算或 selector | 可由 `todos` 派生，不需要存储 |

可复用原则：业务事实进 store，局部草稿留组件，可计算结果不重复存储。

## 模块拆分

store 版本把职责拆成三个层次：

- `store.ts`：定义 store 初始状态、加载本地缓存、导出 `useStore`、`getStoreMethods`、`subscribeStore`。
- `todos.ts`：封装业务操作和派生 hook，例如 `addTodo`、`toggleTodo`、`useFilteredTodos`、`useTodosChange`。
- `components/*`：组件只读取自己需要的状态，或调用领域函数表达用户动作。

迁移其他功能时也按这个结构拆：`store.ts` 管状态，领域模块管业务操作，组件管 UI。

## 组件改造映射

| 组件 | 迁移前 | 迁移后 |
| --- | --- | --- |
| `App` | 持有所有状态、业务函数和长 props 链 | 只读取 `todos` 做页面级统计，调用 `useTodosChange()` |
| `AddTodoForm` | 从 props 接收 `value`、`onChange`、`onAdd` | 内部持有输入框草稿，提交时调用 `addTodo(value)` |
| `TodoFilters` | 从 props 接收 `currentFilter` 和 `onFilterChange` | 自己读取 `filter` 和 `setFilter` |
| `TodoList` | 接收过滤后的 todos、编辑状态和多个回调 | 调用 `useFilteredTodos()`，只把单个 `todo` 传给 `TodoItem` |
| `TodoItem` | 接收 todo、编辑状态、编辑文本和多个回调 | 读取 `editingTodoId`，视图态调用领域函数，编辑草稿留在 `TodoItemEditor` |
| `ClearCompletedButton` | 从 props 接收 `completedCount` 和清空回调 | 用 selector 计算 `completedCount`，点击调用 `clearCompletedTodos` |

可复用原则：删除“只为透传而存在”的 props，但保留表达组件身份的数据 props，例如 `TodoItem` 的 `todo`。

## 业务函数迁移

把下面这类函数从组件移动到领域模块：

- 只操作业务数据的函数：`toggleTodo`、`toggleAllTodos`、`clearCompletedTodos`。
- 需要协调多个 store 字段的函数：`deleteTodo` 删除当前编辑项时调用 `cancelEditing()`。
- 表单提交后的业务动作：`addTodo(text)` 接收文本，不接收组件 setter。

领域函数内部使用 `getStoreMethods()`，避免要求调用方传入 `setTodos`、`setFilter` 等实现细节。

## 副作用迁移

传统版本在 `App` 中用 `useEffect` 根据 `todos` 写 localStorage。store 版本改为：

- `store.ts` 在初始化时读取 localStorage。
- `todos.ts` 提供 `useTodosChange()`。
- `useTodosChange()` 通过 `subscribeStore()` 只监听 `todos` 变化，并返回 unsubscribe。
- `App` 调用 `useTodosChange()` 激活外部同步。

可复用原则：副作用放在领域模块，组件只负责启用它；不要把 store 状态再复制回组件 state。

## 迁移步骤

1. 保留旧版行为，先列出功能点：新增、完成切换、全选、过滤、编辑、删除、清空、持久化。
2. 盘点状态，把共享业务状态、局部草稿、派生值分开。
3. 创建 `store.ts`，只放共享业务状态，并给每个属性写 `/** */` 注释。
4. 创建领域模块，把业务操作迁出去，内部使用 `getStoreMethods()`。
5. 从叶子组件开始删除回调 props，让组件直接调用领域函数。
6. 再删除中间组件的透传 props。
7. 把派生列表、计数等移动到 selector 或领域 hook。
8. 用 `subscribeStore()` 迁移外部同步副作用。
9. 逐项验证旧版功能仍然一致。

## 这个示例不迁移什么

- 不把 `newTodoText` 放进 store，因为它只服务于新增表单。
- 不把 `editingText` 放进 store，因为它只是当前编辑输入框草稿。
- 不把 `filteredTodos`、`completedCount` 存进 store，因为它们可以由 `todos` 和 `filter` 计算出来。
- 不删除 `TodoItem` 的 `todo` prop，因为列表项仍然需要明确接收自己要渲染的数据。
