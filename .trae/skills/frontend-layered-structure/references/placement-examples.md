# 分层结构完整示例

以电商后台管理系统为例，功能包含登录/注册、商品管理（列表、新增、编辑）、订单管理（列表、详情）、用户管理。

## 完整目录树

```text
src/
├── components/
│   ├── Button/           # 通用按钮
│   │   ├── Button.tsx
│   │   ├── Button.module.css
│   │   └── index.ts
│   ├── Table/            # 通用表格
│   ├── Modal/            # 通用弹窗
│   ├── Pagination/       # 通用分页
│   └── Layout/           # 后台布局（侧边栏+顶栏）
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
│
├── pages/
│   ├── LoginPage.tsx          # 登录页，对应 /login
│   ├── HomePage.tsx           # 首页，对应 /
│   ├── ProductListPage.tsx    # 商品列表页
│   ├── ProductEditPage.tsx    # 商品编辑页
│   ├── OrderListPage.tsx      # 订单列表页
│   ├── OrderDetailPage.tsx    # 订单详情页
│   └── UserListPage.tsx       # 用户列表页
│
├── hooks/
│   ├── usePagination.ts  # 分页逻辑（多个列表页复用）
│   ├── useAuth.ts        # 登录状态判断（全局使用）
│   └── useDebounce.ts    # 搜索防抖（商品/订单搜索复用）
│
├── utils/
│   ├── format.ts         # 日期、金额格式化
│   ├── validate.ts       # 表单校验（手机号、邮箱）
│   └── storage.ts        # token 存取
│
├── services/
│   ├── http.ts           # axios 实例（带 token 拦截器）
│   ├── auth.ts           # 登录、登出接口
│   ├── product.ts        # 商品 CRUD 接口
│   ├── order.ts          # 订单查询接口
│   └── user.ts           # 用户管理接口
│
├── types/
│   ├── user.ts           # User、UserRole 类型
│   ├── product.ts        # Product、ProductParams 类型
│   ├── order.ts          # Order、OrderStatus 类型
│   └── api.ts            # ApiResponse、PageResult 通用类型
│
├── constants/
│   ├── api.ts            # API 路径常量
│   ├── storage.ts        # localStorage key
│   └── enums.ts          # 订单状态、用户角色枚举
│
├── assets/
│   ├── images/           # Logo、默认头像
│   ├── svg/              # 菜单图标
│   └── fonts/            # 字体文件
│
├── App.tsx               # 路由配置
└── main.tsx              # 入口文件
```

## services 代码示例

```typescript
// services/http.ts — 统一实例，配置 baseURL、token 拦截器、错误处理
import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default http;
```

```typescript
// services/user.ts — 按业务领域封装，组件中禁止直接写 fetch/axios
import http from './http';
import type { User, UserUpdateParams } from '../types/user';

export const getUserInfo = (id: string) => {
  return http.get<User>(`/api/users/${id}`);
};

export const updateUser = (data: UserUpdateParams) => {
  return http.put('/api/users', data);
};
```

## types 代码示例

```typescript
// types/api.ts — 通用响应与分页类型
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageParams {
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
}
```

```typescript
// types/user.ts — 与 services/user.ts 一一对应
export type UserRole = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
}

export interface UserUpdateParams {
  id: string;
  name?: string;
  role?: UserRole;
}
```

## 通用组件目录示例

```text
components/Table/
├── Table.tsx           # 组件实现，禁止调用 API、禁止业务逻辑
├── Table.module.css    # 组件样式用 CSS Modules，不放 assets/
└── index.ts            # 统一导出
```
