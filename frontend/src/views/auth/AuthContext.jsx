// 集中管理登入者狀態,並提供註冊、登入、登出操作
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import api from '../../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  const loadUser = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setStatus('authenticated');
    } catch (error) {
      setUser(null);
      setStatus(error.response?.status === 401 ? 'anonymous' : 'error');
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    setUser(response.data.user);
    setStatus('authenticated');
  }, []);

  // 註冊成功後同步更新登入狀態,讓使用者可直接進入受保護頁面
  const register = useCallback(async (name, email, password) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
    });
    setUser(response.data.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, register, login, logout, reloadUser: loadUser }),
    [user, status, register, login, logout, loadUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth 必須在 AuthProvider 內使用');
  }
  return context;
}
