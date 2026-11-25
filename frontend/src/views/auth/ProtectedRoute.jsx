import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute() {
  const { status, reloadUser } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <p className="status-message">正在確認登入狀態…</p>;
  }
  if (status === 'error') {
    return (
      <main className="auth-card">
        <p role="alert">目前無法連線確認登入狀態。</p>
        <button type="button" onClick={reloadUser}>重試</button>
      </main>
    );
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
