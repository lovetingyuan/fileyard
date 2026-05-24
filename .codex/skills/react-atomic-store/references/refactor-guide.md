# react-atomic-store 重构指南

目标不是把所有 `useState` 都移到 store，而是把共享业务状态和业务操作从组件树中抽离出来，让组件只声明 UI 和少量局部交互状态。

## 1. 先做状态盘点

迁移前先读代码，列出每个状态和它的流向：

- 状态值：如 `todos`、`filter`、`editingTodoId`。
- 修改函数：如 `addTodo`、`toggleTodo`、`deleteTodo`。
- 派生值：如 `filteredTodos`、`activeCount`、`completedCount`。
- 副作用：如 localStorage 同步、远程请求、订阅。
- props 路径：哪些 props 只是为了把状态或 setter 传到更深层组件。

用下面的规则分类：

| 类型 | 处理方式 |
| --- | --- |
| 多个组件都要读写的业务状态 | 放进 store |
| 只在一个输入框、弹窗、单个编辑器里使用的草稿状态 | 保留为组件内 `useState` |
| 可由 store 状态计算出的值 | 使用 selector、`useMemo` 或领域 hook 派生 |
| 业务操作 | 移到领域模块，内部用 `getStoreMethods()` 读写 store |
| 外部同步副作用 | 用 `subscribeStore()` 封装成 hook，并清理订阅 |

## 2. 设计 store 边界

按功能域建 store，不按组件建 store。一个 todo 功能域可以有 `todos`、`filter`、`editingTodoId`，但不应该把 `newTodoText` 这种表单草稿也放进去。

```ts
export const { useStore, getStoreMethods, subscribeStore } = createStore('todo-list-store', {
  /** Persisted todo records displayed by the app. */
  todos: loadTodos(),
  /** Current list filter used by the filter nav and visible list. */
  filter: 'all' as Filter,
  /** Todo id currently in edit mode; null means no item is being edited. */
  editingTodoId: null as string | null,
})
```

每个 store 属性都要有 `/** */` 注释，说明这个状态代表什么，而不是重复类型名。

## 3. 抽出业务操作

把原来写在顶层组件里的业务函数移到领域模块，例如 `todos.ts`。这些函数不是 hook，不接收组件 setter；它们通过 `getStoreMethods()` 直接读写 store。

```ts
export function toggleTodo(todoId: string) {
  const { setTodos } = getStoreMethods()
  setTodos(currentTodos =>
    currentTodos.map(todo => (todo.id === todoId ? { ...todo, completed: !todo.completed } : todo)),
  )
}
```

保留不可变更新和函数式 setter。跨状态操作也放在领域函数里，例如删除正在编辑的 todo 时同时取消编辑状态。

## 4. 改造组件

组件只读取自己渲染所需的状态，只调用表达业务意图的函数。

- 顶层组件不再持有所有业务状态，也不再组装长 props 链。
- 中间组件删除纯透传 props。
- 叶子组件可以直接调用 `toggleTodo(todo.id)`、`deleteTodo(todo.id)` 这类领域函数。
- 真正属于组件局部交互的状态继续留在组件里，例如新增输入框的 `value`、单个编辑表单的 `editingText`。
- 仍然保留代表组件身份或渲染数据的 props，例如 `TodoItem` 仍然接收 `todo`。

## 5. 处理派生数据

派生数据不要重复存进 store。

- 简单标量可以用 selector：`useStore(state => state.todos.length)`。
- 返回数组或对象时，避免 selector 每次返回新引用；优先写领域 hook，并用 `useMemo` 控制引用。
- 多处复用的派生逻辑放进领域模块，例如 `useFilteredTodos()`。

## 6. 处理副作用

只有和外部系统同步时才使用副作用。不要用 `useEffect` 把 store 状态复制到组件 state。

```ts
export function useTodosChange() {
  useEffect(() => {
    return subscribeStore(({ key, value }) => {
      if (key === 'todos') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      }
    })
  }, [])
}
```

订阅函数必须返回取消订阅函数。把 hook 放在功能域入口组件或顶层组件中调用。

## 7. 删除 props 透传

删除只用于传递业务状态和 setter 的 props：

- `onToggleTodo`、`onDeleteTodo` 这类回调改为直接调用领域函数。
- `currentFilter`、`onFilterChange` 改为组件内读取 `filter` 和 `setFilter`。
- `completedCount` 改为按钮组件内用 selector 计算。

保留这几类 props：

- 组件自身渲染需要的数据项，如 `todo`。
- 通用组件的配置参数，如尺寸、样式变体、文案。
- 跨边界的事件契约，如真正可复用组件对外暴露的 `onSelect`。

## 8. 验证清单

- 原有用户行为一致：新增、切换、全选、过滤、编辑、删除、清空、持久化。
- 每个 store 属性有注释。
- 没有无意义的中间 props 透传。
- 没有把输入草稿、临时 hover、单个表单状态过度全局化。
- 领域函数使用 `getStoreMethods()`，组件优先调用领域函数而不是散落复杂 setter。
- selector 不返回每次新建的数组或对象，除非调用方能稳定处理。
- `subscribeStore()` 的订阅有清理函数。
- 运行项目的类型检查、构建或测试命令；涉及 UI 时用真实浏览器验证关键流程。

## 常见错误

- 把所有 state 都放进 store，导致局部交互状态全局化。
- 迁移后仍让 `App` 持有大量业务函数，只是把数据放进 store。
- 在组件中到处写复杂 `setTodos(current => ...)`，导致业务逻辑分散。
- 用 `getXxx()` 在 render 中读取值并期待响应式更新；需要响应式渲染时应解构字段或使用 selector。
- selector 返回新数组或新对象，造成不必要的渲染。
- 订阅 store 后忘记返回 unsubscribe。
