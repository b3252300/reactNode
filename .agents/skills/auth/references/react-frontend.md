# React 前端範本(Vite + React Router + axios)

## 目錄

- 開發環境同源設定
- api.js(axios 與自動 refresh)
- AuthContext.jsx
- RegisterPage.jsx
- LoginPage.jsx
- ProtectedRoute.jsx
- 使用方式

## 開發環境同源設定

用 Vite proxy 讓瀏覽器以為前後端同網域,可以避開多數 cookie 與 CORS 問題:

```js
// vite.config.js
export default {
  server: { proxy: { '/api': 'http://localhost:4000' } },
};
```

這樣前端直接呼叫 `/api/...` 即可。

## src/api.js

```js
// 建立共用 API client,統一攜帶 cookie 並在需要時更新登入狀態
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // 一定要設,否則瀏覽器不會帶 cookie
});

let refreshing = null; // 同時多個請求 401 時,只 refresh 一次

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = original.url.startsWith('/auth/');

    // 只對「非 auth 端點」且「還沒重試過」的 401 嘗試 refresh,避免無限迴圈
    if (error.response?.status === 401 && !isAuthCall && !original._retried) {
      original._retried = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh').finally(() => (refreshing = null));
        await refreshing;
        return api(original); // refresh 成功,重送原請求
      } catch {
        // refresh 也失敗,交給呼叫端處理(通常是導回登入頁)
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

## src/AuthContext.jsx

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from './api';

// 集中管理目前登入者與註冊、登入、登出操作
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 載入中,避免畫面閃一下登入頁

  // 重新整理頁面時,向後端詢問目前是否已登入
  useEffect(() => {
    api.get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
  }, []);

  // 呼叫註冊 API;後端建立帳號並簽發 cookie 後同步更新登入狀態
  const register = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout'); // 通知後端撤銷 token
    } finally {
      setUser(null); // 即使請求失敗,前端也要清掉登入狀態
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

## src/RegisterPage.jsx

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

// 提供新使用者建立帳號的表單;伺服器仍會重新驗證所有欄位
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || '註冊失敗,請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
        autoComplete="name" maxLength={100} required />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        autoComplete="email" maxLength={254} required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password" minLength={12} required />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>註冊</button>
      <Link to="/login">已有帳號?登入</Link>
    </form>
  );
}
```

## src/LoginPage.jsx

```jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

// 提供既有使用者登入表單,成功後返回原本要前往的頁面
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || '登入失敗,請稍後再試');
    } finally {
      setSubmitting(false); // 防止重複送出
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        autoComplete="username" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password" required />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>登入</button>
    </form>
  );
}
```

## src/ProtectedRoute.jsx

```jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

// 未登入時導向登入頁,避免受保護畫面在載入登入狀態前閃現
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p>載入中...</p>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
```

## 使用方式

```jsx
// main.jsx:設定前端路由,並在所有頁面上提供共用登入狀態
<BrowserRouter>
  <AuthProvider>
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
      </Route>
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

登出按鈕:`const { logout } = useAuth();` 然後 `<button onClick={logout}>登出</button>`。

重要:前端的 ProtectedRoute 只是為了使用者體驗,**真正的保護在後端的 `requireAuth`**。任何人都能改前端程式碼,所以每個需要登入的 API 都必須在後端驗證。
