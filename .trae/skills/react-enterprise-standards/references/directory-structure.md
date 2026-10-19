# 目录结构规范（Feature-Based 架构）

企业级 React 项目的核心是按业务功能（Feature）划分，而非按文件类型堆叠。

## 推荐目录结构

```
src/
├── app/                    # 应用全局配置
│   ├── router/             # 路由配置
│   ├── store/              # 全局状态（Redux Toolkit / Zustand）
│   ├── providers/          # 全局 Provider 组合
│   └── App.tsx
├── features/               # 业务模块（核心）
│   ├── auth/
│   │   ├── components/     # 模块内组件
│   │   │   ├── LoginForm.tsx
│   │   │   └── index.ts    # 统一导出
│   │   ├── hooks/          # 模块内自定义 Hooks
│   │   │   └── useAuth.ts
│   │   ├── services/       # API 请求
│   │   │   └── authApi.ts
│   │   ├── types/          # 模块内类型定义
│   │   │   └── auth.types.ts
│   │   ├── authSlice.ts    # 状态切片（如用 Redux）
│   │   └── index.ts        # 公共 API 出口
│   ├── dashboard/
│   └── user-profile/
├── shared/                 # 跨模块共享
│   ├── components/         # 通用 UI 组件
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.scss
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   └── Modal/
│   ├── hooks/              # 通用 Hooks
│   ├── utils/              # 工具函数
│   ├── constants/          # 常量
│   └── types/              # 全局类型
├── assets/                 # 静态资源
├── styles/                 # 全局样式
└── main.tsx                # 入口
```

## 三种项目规模的演进路径

| 规模 | 结构 | 适用场景 |
|------|------|----------|
| 小型（<15 组件） | 扁平结构：`components/` + `hooks/` + `assets/` | 原型、内部工具 |
| 中型（15-30 组件） | 按类型分：`pages/` + `components/ui/` + `components/form/` | 中小项目 |
| 大型（30+ 组件） | Feature-Based：`features/` 按业务模块自治 | 企业级应用 |

## 文件归属判断

- 只被单个 feature 使用的组件/Hook/类型 → 放该 feature 内部
- 被 2 个及以上 feature 使用 → 提升到 `shared/`
- feature 对外只通过 `index.ts` 暴露公共 API，外部禁止深路径导入 feature 内部文件
