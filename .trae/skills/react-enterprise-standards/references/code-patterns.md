# 代码规范实战示例

## 1. 组件设计：职责分离

### 反面示例 — 巨型组件（职责混乱，禁止出现）

```tsx
// UserDashboard.tsx — 300+ 行，所有逻辑堆在一起
function UserDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [filter, setFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  // ... 还有 20 个 useState

  useEffect(() => { /* 数据请求 */ }, [page, pageSize, sortBy, filter]);

  const handleSearch = () => { /* 50 行搜索逻辑 */ };
  const handleSort = () => { /* 30 行排序逻辑 */ };
  const handleExport = () => { /* 40 行导出逻辑 */ };

  return (
    <div>
      {/* 200 行 JSX 模板 */}
    </div>
  );
}
```

### 正面示例 — 数据 Hook / 容器 Hook / 展示组件 / 容器组件四层分离

```tsx
// features/user-dashboard/hooks/useUserList.ts
export function useUserList(params: UserListParams) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users', params],
    queryFn: () => userApi.getList(params),
  });
  return { users: data, isLoading, error, refetch };
}

// features/user-dashboard/hooks/useUserDashboard.ts
export function useUserDashboard() {
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortConfig>({ key: 'name', order: 'asc' });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });

  const params = useMemo(() => ({ ...pagination, ...sort, filter }), [pagination, sort, filter]);
  const { users, isLoading, refetch } = useUserList(params);

  const handleSearch = useCallback((value: string) => {
    setFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  return { users, isLoading, filter, sort, pagination, handleSearch, setSort, setPagination };
}

// features/user-dashboard/components/UserTable.tsx
interface UserTableProps {
  users: User[];
  loading: boolean;
  sort: SortConfig;
  onSort: (key: string) => void;
}

export const UserTable: FC<UserTableProps> = ({ users, loading, sort, onSort }) => {
  if (loading) return <Skeleton rows={10} />;
  return (
    <Table dataSource={users} loading={loading} sort={sort} onSort={onSort}>
      <Column title="姓名" dataIndex="name" />
      <Column title="邮箱" dataIndex="email" />
      <Column title="角色" dataIndex="role" />
    </Table>
  );
};

// features/user-dashboard/UserDashboard.tsx（容器组件，< 60 行）
export const UserDashboard: FC = () => {
  const dashboard = useUserDashboard();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  return (
    <DashboardLayout>
      <UserFilter value={dashboard.filter} onChange={dashboard.handleSearch} />
      <UserToolbar onExport={handleExport} />
      <UserTable
        users={dashboard.users}
        loading={dashboard.isLoading}
        sort={dashboard.sort}
        onSort={dashboard.setSort}
      />
      <Pagination current={dashboard.pagination.page} onChange={dashboard.setPagination} />
      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </DashboardLayout>
  );
};
```

## 2. API 层：统一 Service 模式

```ts
// shared/services/http.ts — 统一封装 axios 实例
import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
});

http.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) useAuthStore.getState().logout();
    message.error(error.response?.data?.message ?? '请求失败');
    return Promise.reject(error);
  }
);

// features/auth/services/authApi.ts
import { http } from '@/shared/services/http';

export const authApi = {
  login: (data: LoginRequest) => http.post<LoginResponse>('/auth/login', data),
  logout: () => http.post('/auth/logout'),
  refreshToken: () => http.post<{ token: string }>('/auth/refresh'),
};

// features/auth/types/auth.types.ts
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}
```
