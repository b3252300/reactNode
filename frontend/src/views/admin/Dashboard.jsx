import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PropertyStatusAssets from '@/views/admin/PropertyStatusAssets/List.tsx'

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');

  async function handleLogout() {
    setError('');
    try {
      await logout();
    } catch {
      setError('無法聯絡伺服器撤銷登入憑證，請稍後重試。');
    }
  }

  return (
    <main className="">
      {/* <p className="eyebrow">已登入</p>
      <h1>你好，{user.name || user.email}</h1> */}
      {/* <p className="description">你的登入狀態會在重新整理後自動恢復。</p> */}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="dashboard-actions">
        {/* <Link to="/members" className="primary-link-button">
          查看會員清單
        </Link>
        <button type="button" className="secondary-button" onClick={handleLogout}>
          登出
        </button> */}
        <PropertyStatusAssets/>
      </div>
    </main>
  );
}
