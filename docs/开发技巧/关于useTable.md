---
status: complete
---

# 关于 useTable

## 源码

### useTable

```ts
import { reactive, watch, toValue, type MaybeRefOrGetter } from 'vue'
import { useAsyncState } from '@vueuse/core'

export interface UseTableOptions<T = any> {
    /** 数据获取函数 */
    request: (params: FetchParams) => Promise<FetchResult<T>>
    /** 初始查询参数（除分页外的业务参数） */
    queryParams?: MaybeRefOrGetter<Record<string, any>>
    /** 是否立即执行 */
    immediate?: boolean
    /** 是否监听查询参数变化自动重新查询 */
    watchQueryParams?: boolean
    /** 默认分页配置 */
    defaultPagination?: {
        currentPage?: number
        pageSize?: number
    }
    /** 参数处理函数（在发送请求前对参数进行处理） */
    paramsHandler?: (params: FetchParams) => FetchParams
    /** 数据转换函数 */
    transform?: (data: T[]) => T[]
    /** 请求成功回调 */
    onSuccess?: (data: T[], total: number) => void
    /** 请求失败回调 */
    onError?: (error: unknown) => void
    /** 数据字段 */
    listField?: string
    totalField?: string
}

export interface FetchParams extends Record<string, any> {
    /** 当前页码 */
    page: number
    /** 每页数量 */
    pageSize: number
}

export interface FetchResult<T = any> {
    /** 数据列表 */
    list: T[]
    /** 总数 */
    total: number
    /** 其他字段 */
    [key: string]: any
}

export function useTable<T = any>(options: UseTableOptions<T>) {
    const {
        request,
        queryParams,
        immediate = true,
        watchQueryParams = true,
        defaultPagination = {},
        paramsHandler,
        transform,
        onSuccess,
        onError,
        listField = 'list',
        totalField = 'total'
    } = options

    const {
        currentPage: defaultCurrentPage = 1,
        pageSize: defaultPageSize = 10
    } = defaultPagination

    // 分页状态
    const pagination = reactive({
        currentPage: defaultCurrentPage,
        pageSize: defaultPageSize,
        total: 0
    })

    // 获取查询参数
    const getQueryParams = () => toValue(queryParams) ?? {}

    /** 构建请求参数 */
    const buildRequestParams = () => {
        const totalParams = {
            page: pagination.currentPage,
            pageSize: pagination.pageSize,
            ...getQueryParams()
        }

        // 如果更严谨一些，可以进一步判断是否是函数
        const finalParams = paramsHandler
            ? paramsHandler(totalParams)
            : totalParams
        return finalParams
    }

    // 实际的数据获取函数
    const doFetch = async () => {
        try {
            // 如果提供了参数处理函数，则先处理参数
            const result = await request(buildRequestParams())
            pagination.total = result[totalField]

            const finalData = transform
                ? transform(result[listField])
                : result[listField]
            onSuccess?.(finalData, result[totalField])

            return finalData
        } catch (err) {
            onError?.(err)
            throw err
        }
    }

    // 使用 useAsyncState 管理异步状态
    const {
        state: data,
        isLoading: loading,
        error,
        execute
    } = useAsyncState<T[]>(doFetch, [], {
        immediate,
        resetOnExecute: false
    })

    // 刷新数据（保持当前分页）
    const refresh = () => execute()

    // 重新查询（重置到第一页）
    const search = () => {
        pagination.currentPage = 1
        return execute()
    }

    // 分页变化处理
    const handlePageChange = (page: number) => {
        pagination.currentPage = page
        execute()
    }

    // 每页数量变化处理
    const handleSizeChange = (size: number) => {
        pagination.pageSize = size
        pagination.currentPage = 1
        execute()
    }

    // 重置分页到初始状态
    const resetPagination = () => {
        pagination.currentPage = defaultCurrentPage
        pagination.pageSize = defaultPageSize
    }

    // 监听查询参数变化，自动重新查询（可选）
    if (queryParams && watchQueryParams) {
        watch(
            () => toValue(queryParams),
            () => {
                search()
            },
            { deep: true }
        )
    }

    return {
        /** 表格数据 */
        data,
        /** 加载状态 */
        loading,
        /** 错误信息 */
        error,
        /** 分页信息 */
        pagination,
        /** 刷新数据（保持当前分页） */
        refresh,
        /** 重新查询（重置到第一页） */
        search,
        /** 分页变化处理 */
        handlePageChange,
        /** 每页数量变化处理 */
        handleSizeChange,
        /** 重置分页 */
        resetPagination
    }
}

export type UseTableReturn<T = any> = ReturnType<typeof useTable<T>>

```

### useTableComponent

```ts
import { defineComponent, h } from 'vue'
import { ElTable, ElTableColumn, ElPagination } from 'element-plus'
import { useTable, type UseTableOptions } from '../use-table'

export interface ColumnConfig {
    /** 列字段名 */
    prop: string
    /** 列标题 */
    label: string
    /** 列宽度 */
    width?: number | string
    /** 最小宽度 */
    minWidth?: number | string
    /** 对齐方式 */
    align?: 'left' | 'center' | 'right'
    /** 是否固定列 */
    fixed?: boolean | 'left' | 'right'
    /** 其他 el-table-column 支持的属性 */
    [key: string]: any
}

export interface UseTableComponentOptions<T = any> extends UseTableOptions<T> {
    /** 列配置 */
    columns: ColumnConfig[]
    /** 表格属性 */
    tableProps?: Record<string, any>
    /** 分页属性 */
    paginationProps?: Record<string, any>
}

export function useTableComponent<T = any>(
    options: UseTableComponentOptions<T>
) {
    const {
        columns,
        tableProps = {},
        paginationProps = {},
        ...tableOptions
    } = options

    // 内部调用 useTable 获取所有逻辑
    const tableState = useTable<T>(tableOptions)

    // 返回一个 Vue 组件
    const TableComponent = defineComponent({
        name: 'DynamicTableComponent',
        setup() {
            return () =>
                h('div', { class: 'table-component-wrapper' }, [
                    // 表格
                    h(
                        ElTable,
                        {
                            data: tableState.data.value,
                            vLoading: tableState.loading.value,
                            ...tableProps
                        },
                        () =>
                            columns.map(col =>
                                h(ElTableColumn, {
                                    key: col.prop,
                                    ...col
                                })
                            )
                    ),
                    // 分页
                    h(ElPagination, {
                        'class': 'table-pagination',
                        'currentPage': tableState.pagination.currentPage,
                        'pageSize': tableState.pagination.pageSize,
                        'total': tableState.pagination.total,
                        'layout': 'total, sizes, prev, pager, next, jumper',
                        'pageSizes': [10, 20, 50, 100],
                        'onUpdate:currentPage': tableState.handlePageChange,
                        'onUpdate:pageSize': tableState.handleSizeChange,
                        ...paginationProps
                    })
                ])
        }
    })

    return TableComponent
}

```

## 设计思路

在日常中后台系统开发中，table 的查询占据了大量的篇幅，因此或多或少都会对 table 组件进行封装，那么应该如何进行封装呢？理想的状态当然是所有的情况都可以通过这个封装的 table 组件来完成。但是现实是随着业务的迭代，表格 ui 层的表现总会遇到目前封装的 table 无法实现的情况，但是表格的数据的方法可以说是有限的。所以在封装 table 的时候，我们应该把 ui 和 数据 进行分开。

那么如何分开呢？本文的方案是提供 **两层 API**，满足不同的场景需求。分层结构如图：

<img src="./关于useTable.assets/image-20251212123058941.png" alt="image-20251212123058941" style="zoom:50%;" />

当业务的表格是标准化的、无特殊定制的情况时，那么通过更上层的 `useTableComponent` 就可以完成快速开发。而业务的表格 ui 需要高度自定义、需求复杂时，我们也可以使用 `useTable` 来简化数据的处理，专注于 ui 的开发。

## useTable

### 函数签名

既然是处理数据，那么我们就应该想清楚，这个函数要接收什么，以及返回什么。

想要搞清楚接收什么参数，就要回顾开发中，我们拿到数据都做了什么，如图：

<img src="./关于useTable.assets/image-20251212144727019.png" alt="image-20251212144727019" style="zoom:50%;" />

根据这些逻辑，我们可以写出 useTable 需要的参数类型，如下：

```ts
interface UseTableOptions {
  /** 请求函数 */
  request: (params:any) => Promise<any>
  /** 初始查询参数（不包含分页的业务参数）*/
  queryParams: any
  /** 是否监听查询参数变化自动重新查询 */
  watchQueryParams?: boolean
  /** 是否立即执行 */
  immediate?: boolean
  /** 默认分页参数（这个分页参数在我的思考中，仅用于初始化）*/
  defaultPagination?: {
    currentPage?: number
    pageSize?: number
  },
  /** 参数处理函数（在发送请求前对参数进行处理） */
  paramsHandler?: (params: FetchParams) => FetchParams
  /** 数据转换函数 */
  transform?: (data: T[]) => T[]
  /** 请求成功回调 */
  onSuccess?: (data: T[], total: number) => void
  /** 请求失败回调 */
  onError?: (error: unknown) => void
  /** 数据字段 */
  listField?: string
  totalField?: string
}
```

至于返回的参数，这个应该非常好确定。表格数据、数据总数、加载状态、分页信息、刷新数据的方法、重新查询(比如条件变更的时候，页码需要重置到当前页面)、分页变化处理、页容量变化处理。

那么，通过这个，我们就可以很好的写出这个 useTable 的函数签名，如下：

```ts
function useTable(options: UseTableOptions){
  return {
    data,
    total,
    loading,
    pagination,
    refresh,
    search,
    handlePageChange,
    handleSizeChange
  }
}
```

### step1: 处理参数

根据上面的步骤，第一步就是获得最终的处理参数。因此我们需要有一个函数来构建完成的请求参数。我们接收的分页值是一个默认值，所以我们在 useTable 内部，需要单独创建一个分页参数对象，如下：

```ts
function useTable(options: UseTableOptions){
  // 参数解构
  const { defaultPagination, paramsHandler } = options
  const {
    currentPage: defaultCurrentPage = 1,
    pageSize: defaultPageSize = 10
  } = defaultPagination
  
  
  // 分页状态
  const pagination = reactive({
    currentPage: currentPage,
    pageSize: pageSize,
    total: 0
  })
  
  // 因为 queryParams 可能是一个响应式对象，为了取值方便，使用 toValue 来进行提取
  const getQueryParams = () => toValue(queryParams) ?? {}
  
  /** 构建请求参数 */
  const buildRequestParams = ()=>{
    const totalParams = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      ...getQueryParams()
    }
    
    // 如果更严谨一些，可以进一步判断是否是函数
    const finalParams = paramsHandler ? paramsHandler(totalParams) : totalParams
    return finalParams
  }
  
  return {/**...*/}
}
```

### step2: 完善请求函数

当具备参数之后，就可以来利用请求发送请求了，如下：

```ts
function useTable(options: UseTableOptions){
  const {
    request, 
    onSuccess, 
    onError, 
    transform, 
    listField = 'list', 
    totalField = 'total' 
  } = options
  
  /** 省略构建参数的代码 */
  
  /** 获取数据的请求 */
  const fetchData = async () => {
    try{
      // 调用请求函数
      const response = await request(buildRequestParams())
      // 保存数据
      pagination.total = response[totalField]
      // 只保存总数是因为，后续具体的数据将使用 useAsyncState 管理
      
      // 如果需要转换数据，就调用
      const finalData = transform
          ? transform(result[listField])
          : result[listField]
      onSuccess?.(finalData, result[totalField])
			
      return finalData
    } catch (err){
      onError?.(err)
      throw err
    }
  }
  
  return {/**...*/}
}
```

### step3: useAsyncState

使用 [useAsyncState](https://vueuse.org/core/useAsyncState/#useasyncstate) 来管理的要做的事情也很简单，这个方法来自 vueuse。这个方法具体有什么作用，我就不在这里过多介绍了，如下：

```ts
function useTable(options: UseTableOptions){
  const { immediate = true } = options
  
  /** 省略构建参数的代码 */
  /** 省略请求函数的代码 */
  
  const { state: data, isLoading: loading, error, execute } = useAsyncState(doFetch, [], {
    immediate,
    resetOnExecute:false
  })
}
```

### step4: 完善剩余方法

现在只剩下一些辅助方法了，如下：

```ts
function useTable(options: UseTableOptions){
  const { immediate = true } = options
  
  /** 省略构建参数的代码 */
  /** 省略请求函数的代码 */
  /** 省略useAsyncState的代码 */
  
  // 刷新数据-即保持当前查询条件不变，执行一次查询
  const refresh = () => execute()
  
  // 重新查询（重置到第一页）
  const search = () => {
    pagination.currentPage = 1
    return execute()
  }
  
  // 分页变化处理
  const handlePageChange = (page: number) => {
    pagination.currentPage = page
    execute()
  }

  // 每页数量变化处理
  const handleSizeChange = (size: number) => {
    pagination.pageSize = size
    pagination.currentPage = 1
    execute()
  }
  
  // 监听查询参数变化，自动重新查询（可选）
  if (queryParams && watchQueryParams) {
    watch(
      () => toValue(queryParams),
      () => {
        search()
      },
      { deep: true }
    )
  }
  
  return {
    /** 表格数据 */
    data,
    /** 加载状态 */
    loading,
    /** 错误信息 */
    error,
    /** 分页信息 */
    pagination,
    /** 刷新数据（保持当前分页） */
    refresh,
    /** 重新查询（重置到第一页） */
    search,
    /** 分页变化处理 */
    handlePageChange,
    /** 每页数量变化处理 */
    handleSizeChange
  }
}
```

## useTableComponent

这个方法做的事情很简单：

1. 调用 useTable 得到操作一个 table 需要的数据和方法
2. 将这些数据和方法，绑定到一个 table 组件上，这个组件一般来说，选择更上层封装的更好，但是我这个例子中就简单的直接使用 el-table
3. 返回一个组件。

代码如下：

```ts
interface ColumnConfig {
  /** 列字段名 */
  prop: string
  /** 列标题 */
  label: string
  /** 列宽度 */
  width?: number | string
  /** 最小宽度 */
  minWidth?: number | string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 是否固定列 */
  fixed?: boolean | 'left' | 'right'
  /** 其他 el-table-column 支持的属性 */
  [key: string]: any  
}

interface UseTableComponentOptions{
  /** 列配置 */
  columns: ColumnConfig[]
  /** 表格属性 */
  tableProps?: Record<string, any>
  /** 分页属性 */
  paginationProps?: Record<string, any>
}

function useTableComponent(options: UseTableComponentOptions){
  const {
    columns,
    tableProps = {},
    paginationProps = {},
    ...tableOptions // 剩余的属性参数
  } = options
  
  // 内部调用 useTable 获取所有逻辑
  const tableState = useTable<T>(tableOptions)
  
  // 返回一个 Vue 组件
  const TableComponent = defineComponent({
    name: 'DynamicTableComponent',
    setup(){
      return ()=>{
        return h('div', { class: 'table-warpper' }, [
          // 搜索表单，这里进行了省略
          // 表格
          h(
            ElTable,
            {
                data: tableState.data.value,
                vLoading: tableState.loading.value,
                ...tableProps
            },
            () =>
            		// 列组件
                columns.map(col =>
                    h(ElTableColumn, {
                        key: col.prop,
                        ...col
                    })
                )
          ),
          // 分页
          h(ElPagination, {
              'class': 'table-pagination',
              'currentPage': tableState.pagination.currentPage,
              'pageSize': tableState.pagination.pageSize,
              'total': tableState.pagination.total,
              'layout': 'total, sizes, prev, pager, next, jumper',
              'pageSizes': [10, 20, 50, 100],
              'onUpdate:currentPage': tableState.handlePageChange,
              'onUpdate:pageSize': tableState.handleSizeChange,
              ...paginationProps
          })
        ])
      }
    }
  })
  
  return TableComponent
}
```









