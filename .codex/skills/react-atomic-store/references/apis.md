# API

```ts
const { useStore, getStoreMethods, getStoreState, getStateSnapshot, subscribeStore } = createStore(
  'appStore',
  {
    foo: 1,
    bar: false,
  },
)
```

`react-atomic-store@0.0.9` 的 `createStore` 接收两个参数：

- `storeName`: store 名称，必须稳定且唯一。
- `initValue`: store 初始对象。属性会生成同名响应式值、`getXxx` 方法和 `setXxx` 方法。

# useStore

## 读取值

### 读取单个属性的值

以上面的例子举例，foo和bar都是组件中会用到的值。任何组件都可以按需去读取自己想要的值。

```ts
function Foo() {
  const { foo } = useStore()
}
function Bar() {
  const { bar } = useStore()
}
```

注意：**这里读取的方式必须使用解构的语法来获取。**

这里值的读取是“响应式”的，意味着只有当读取到的值发生变化时，当前组件才会被重新运行。

还有另一种方式也可以读取值

```tsx
function Foo() {
  const { getFoo } = useStore()
  return <div>{getFoo()}</div>
}
```

store中所有的属性都会被提供一个以 `get` 开头的驼峰命名的方法用来获取属性值。

这跟上面直接解构读取值的方式的差别在于，这种通过get方式读取仅仅是获取对应属性的最新值，当属性值发生变化时，此时的组件并不会随之重新渲染。

### 读取计算后的值

useStore也可以接受一个**纯函数**（selector）作为参数，这个函数的返回值作为其返回值

```ts
const fooBar = useStore(state => state.foo + state.bar)
```

当selector的返回值发生变化时，当前组件会被重新渲染。需要特别注意的是尽量避免selector返回新的引用类型值。

## 更改值

```tsx
function FooChanger() {
  const { setFoo } = useStore()
  return (
    <div
      onClick={() => {
        setFoo(newValue)
        // or
        setFoo(oldValue => {
          return newValue
        })
      }}
    >
      change foo
    </div>
  )
}
```

store中所有的属性都会被提供一个以 `set` 开头的驼峰命名的方法用来以唯一的方式更新对应属性的值。
可以传递一个新的值；或者也可以传递一个返回新值的方法，这个方法接受现在的值作为参数。

# getStoreMethods

这个方法返回所有属性的读写方法，如下例所示：

```ts
const { getFoo, setFoo, getBar, setBar } = getStoreMethods()
```

主要是为了方便从组件之外的地方来读写store。

# getStoreState

这个方法返回当前 store state 对象，适合在组件外部读取完整状态。组件渲染中需要响应式更新时，优先使用 `useStore()` 或 selector。

```ts
const state = getStoreState()
```

# getStateSnapshot

这个方法返回当前 store state 的只读快照，适合调试、日志或需要防止调用方直接改写状态的读取场景。

```ts
const snapshot = getStateSnapshot()
```

# subscribeStore

这个方法用来订阅store的变化

```ts
const unsubscribe = subscribeStore(({ key, value, oldValue }) => {
  //
})
```

当store中的任意属性发生变化时（这里的变化通过Object.is来判断），subscribeStore的回调都会被调用。
key就是变化的属性名，value是变化后的属性值，oldValue是变化前的属性值。
subscribeStore会返回一个取消订阅的函数。

# Typescript

这个库提供了完善的typescript的支持，你唯一需要做的就是在调用createStore的时候为初始值提供类型声明即可。
