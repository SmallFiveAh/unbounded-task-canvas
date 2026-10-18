---
name: frontend-layered-structure
description: 按分层目录规范（components、pages、hooks、utils、services、types、constants、assets）判断前端文件归属与项目结构组织。当用户询问某个文件或组件该放在哪里、新建页面或模块如何组织目录、审查目录结构是否符合分层规范、或需要将杂乱目录重构为分层结构时使用。不用于编写具体业务功能代码。
---

# 前端分层目录结构规范

按"文件类型分层"模式组织 React/TypeScript 项目。所有文件归属判断都遵循本文件的规则；完整目录树和代码示例见 `references/placement-examples.md`。

## 归属决策流程

遇到"X 应该放在哪里"的问题时，按顺序自上而下判断，命中即停：

1. 纯函数、无副作用、不依赖 React → `utils/`
2. `use` 开头、封装状态或生命周期的逻辑 → 多处复用归 `hooks/`，仅单页面使用留在页面文件内
3. 后端接口请求封装 → `services/`
4. `interface`/`type`/`enum` 且全局共享 → `types/`；仅单组件使用则定义在组件文件内
5. 全局共享的常量值 → `constants/`；局部常量留在使用处
6. 路由直接对应的页面级组件 → `pages/`
7. 无业务逻辑、被多页面复用的 UI 组件或布局组件 → `components/`
8. 图片、字体、SVG、全局样式文件 → `assets/`

## 各目录职责与硬性规则

### components/ — 通用组件

- 放：Button、Modal、Table、Input、Select 等基础 UI 组件；Header、Sidebar、Footer 等布局组件
- 不放：LoginForm、UserCard 等只被单个页面使用的业务组件
- 硬性规则：组件内部禁止直接调用 API，禁止包含业务逻辑（登录、下单等）

### pages/ — 页面组件

- 放：路由直接对应的页面组件，一个路由一个文件（如 HomePage.tsx 对应 /、OrderDetailPage.tsx 对应 /orders/:id）；页面级布局组件（如 DashboardLayout.tsx）
- 不放：可复用的子组件和通用组件
- 允许：页面组件可以包含业务逻辑、调用 API、使用 components/ 中的通用组件
- 页面过于复杂时，拆出的子组件放入页面专属目录或 components/

### hooks/ — 通用自定义 Hooks

- 放：useDebounce、useThrottle、useLocalStorage、useFetch、usePagination、useAuth、usePermission、useResponsive、useEventListener 等被多处复用的逻辑
- 不放：只在某个页面使用的 Hook（放在该页面文件内部）
- 规则：命名必须以 use 开头；通用 Hook 内部禁止写死特定业务细节（如具体 API 地址）

### utils/ — 工具函数

- 放：formatDate、formatMoney、isEmail、isPhone 等纯函数；localStorage 封装、文件下载、剪贴板操作；函数版 debounce/throttle；树形数据处理
- 不放：包含 React 状态或副作用的逻辑（归 hooks/）；特定业务计算（如订单总价，归业务模块）
- 规则：必须是纯函数——相同输入永远得到相同输出，不修改外部状态，不依赖 React 生命周期

### services/ — API 请求

- 放：http.ts（axios/fetch 实例，统一配置 baseURL、token 拦截器、错误处理）；按业务领域拆分的 auth.ts、user.ts、order.ts、product.ts 等 API 文件
- 硬性规则：组件和页面内禁止直接写 fetch 或 axios 调用，必须封装到 services/；所有请求统一使用 http.ts 导出的实例，禁止直接使用 axios 全局对象；每个函数返回 Promise 并统一处理错误

### types/ — 类型定义

- 放：接口返回的数据类型（User、Order、Product）；通用类型（PageParams、PageResult、ApiResponse）；declare global 全局类型声明
- 不放：只在单个组件内使用的 Props 类型（定义在组件文件内）
- 规则：只包含 interface、type、enum，不包含实现；类型文件与 services/ 的 API 文件一一对应

### constants/ — 常量

- 放：API_BASE_URL、STORAGE_KEY、ORDER_STATUS 等全局常量；正则表达式（手机号、邮箱）；应用配置（默认分页大小、上传大小限制）；枚举值（订单状态、用户角色）
- 不放：只在单个组件使用的魔法数字（留在组件内）
- 规则：命名用全大写加下划线（MAX_PAGE_SIZE）；只放全局共享常量，防止常量文件膨胀

### assets/ — 静态资源

- 放：images/（logo、背景图）、fonts/（woff、woff2）、svg/（图标）、styles/（reset.css、variables.css 等全局样式）
- 不放：组件相关的样式（用 CSS Modules 放在组件目录内）

## 反模式对照

发现以下写法时主动纠正：

| 错误做法 | 正确做法 | 原因 |
|---|---|---|
| components/ 中放 LoginForm | 放 pages/LoginPage.tsx 内部或 pages/ 下 | 登录表单是业务组件，不会被其他页面复用 |
| utils/ 中放 useDebounce | 放 hooks/ | use 开头的是 Hook，需要 React 支持 |
| services/ 或组件中直接写 fetch | 统一使用 http.ts 中的实例 | 便于统一处理 token、错误、loading |
| types/ 中定义组件内部 Props | 在组件文件内定义 | 避免类型文件过多、查找困难 |
| constants/ 中放页面级常量 | 放在页面文件内 | 避免全局常量文件膨胀 |
| pages/ 中写通用组件 | 放 components/ | 页面组件是路由入口，不应包含可复用组件 |

## 结构升级信号

当项目出现以下任一信号时，说明按文件类型分层已不够用，建议重构为按功能模块聚合的 features/ 结构，将相关代码聚合到 `features/<domain>/` 目录下：

1. pages/ 超过 20 个文件，且每个页面开始包含大量子组件
2. components/ 中开始出现业务组件（如 ProductTable、OrderForm）
3. services/ 和 types/ 文件过多，且与业务模块的对应关系混乱
4. 团队超过 5 人，经常出现代码冲突
5. 一个功能改动需要同时修改 4 个以上目录（如修改商品功能要动 pages/、services/、types/、constants/）
