---
name: react-enterprise-standards
description: 按 React 企业级规范生成、审查或重构 React 与 TypeScript 项目代码。当用户要求搭建 React 项目结构、按 Feature-Based 架构组织目录、控制文件行数与圈复杂度、拆分巨型组件、编写 API Service 层、统一命名规范，或配置 ESLint、Prettier、Husky、lint-staged 等工程化工具链时使用。不用于非 React 项目或纯小程序开发。
---

# React 企业级项目开发规范

生成或审查 React 代码时强制执行以下核心规则。细节与完整示例见 references/，可直接套用的配置文件见 assets/。

## 一、目录结构（Feature-Based）

大型项目（30+ 组件）必须按业务模块划分，禁止按文件类型堆叠。顶层结构：

```
src/
├── app/          # 全局配置：router/ store/ providers/ App.tsx
├── features/     # 业务模块，每个模块自治
│   └── <feature>/
│       ├── components/   # 模块内组件（含 index.ts 统一导出）
│       ├── hooks/        # 模块内自定义 Hooks
│       ├── services/     # API 请求
│       ├── types/        # 模块内类型
│       └── index.ts      # 公共 API 出口
├── shared/       # 跨模块共享：components/ hooks/ utils/ constants/ types/
├── assets/  styles/  main.tsx
```

规模演进：小型（<15 组件）扁平结构；中型（15-30）按类型分；大型（30+）用 Feature-Based。不要为小型项目过度设计。完整目录树与共享组件内部结构见 [references/directory-structure.md](references/directory-structure.md)。

## 二、文件行数红线（ESLint 强制）

| 指标 | 上限 | 规则 |
|------|------|------|
| 单文件行数 | 200（不含空行注释） | `max-lines` |
| 单函数行数 | 40 | `max-lines-per-function` |
| 圈复杂度 | 10 | `complexity` |
| 嵌套深度 | 4 层 | `max-depth` |
| 函数参数 | 5 个，超出改对象传参 | `max-params` |

其他强制：禁止 `any`（`@typescript-eslint/no-explicit-any: error`）；`no-console` 仅放行 warn/error。测试与 stories 文件豁免行数与复杂度规则。完整配置直接复制 [assets/eslintrc.template.json](assets/eslintrc.template.json)。

## 三、组件设计铁律

写组件时遵守职责分离：

1. **数据请求 → Hook**：用 `useQuery` 或自定义 Hook 封装，组件不直接发请求。
2. **状态与业务逻辑 → 容器 Hook**：如 `useUserDashboard` 聚合 filter/sort/pagination，handler 用 `useCallback`，派生参数用 `useMemo`。
3. **展示 → 纯展示组件**：`FC<Props>` 接收数据与回调，loading 态渲染 Skeleton，不含业务逻辑。
4. **容器组件 < 60 行**：只做 Hook 调用与 JSX 组合。

反面信号（出现即需拆分）：单个组件 10+ 个 useState、handler 超 30 行、JSX 模板超 200 行。完整正反对照示例见 [references/code-patterns.md](references/code-patterns.md)。

## 四、API 层规范

- 统一 axios 实例放 `shared/services/http.ts`：baseURL 读环境变量，请求拦截器注入 token，响应拦截器统一处理 401 登出与错误提示。
- 每个 feature 的 API 收敛在 `services/<name>Api.ts`，导出对象字面量（如 `authApi.login`）。
- 请求/响应类型定义放 `types/<name>.types.ts`，API 全程类型约束。

## 五、命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `UserProfile.tsx` |
| 非组件文件 | camelCase | `useAuth.ts` |
| 目录 | kebab-case 或 camelCase，全项目统一 | `user-profile/` |
| 常量 | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE` |
| CSS Module | 与组件同名 | `Button.module.scss` |
| 类型/接口 | PascalCase | `UserProfile` |
| 自定义 Hook | use 前缀 | `useUserList` |
| 枚举 | PascalCase，值按后端约定 | `enum UserRole { ADMIN = 'admin' }` |

## 六、工程化工具链

新项目脚手架时配置：ESLint + Prettier、Husky + lint-staged（pre-commit 跑 lint-staged 和 `tsc --noEmit`）、Vitest/Jest + RTL、Playwright/Cypress、Storybook。package.json scripts 与 lint-staged 配置模板见 [references/toolchain.md](references/toolchain.md)。

## 七、架构原则（决策依据）

拿不准时按这些原则裁决：

- **单一职责**：组件只渲染，逻辑在 Hook，请求在 Service
- **状态就近**：能放组件内不放全局，能用 URL 参数不用状态管理
- **绝对路径导入**：配置 tsconfig `paths`，禁止 `../../../`
- **类型安全**：禁 any，API 全链路类型约束
- **代码分割**：路由级 `React.lazy()`
- **错误边界**：全局 ErrorBoundary + 接口错误统一拦截
- **可测试性**：业务逻辑在 Hook/Service，组件只做渲染
- **渐进式重构**：随项目规模演进结构，不过度设计
