// 提供新使用者註冊表單,並透過共用驗證狀態完成註冊後登入
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAuth } from './AuthContext';
import ThemeToggle from '@/components/button/ThemeToggle';

export default function RegisterPage() {
  const { register, status } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 送出註冊資料;實際驗證與密碼雜湊由後端執行
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || '註冊失敗，請確認伺服器連線後重試。'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 grid place-items-center p-6 overflow-hidden">
      <div className="fixed top-5 right-5 z-20">
        <ThemeToggle showLabel />
      </div>
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-3xl" />

      <main className="auth-card relative z-10">
        <div className="flex items-center space-x-3 mb-6">
          <div className="brand-logo">
            <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="font-extrabold text-base text-slate-900 dark:text-slate-100">房屋人資產</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">智慧物業包租代管系統</div>
          </div>
        </div>

        <p className="eyebrow">建立管理帳戶</p>
        <h1>註冊物業專員帳號</h1>
        <p className="description">建立帳戶後即可管理房態資產、財務報表與管家派工。</p>

        {status === 'error' && (
          <p className="error-message" role="alert">
            無法連線至註冊服務，請確認後端伺服器已啟動。
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="name" className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            姓名／職稱
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="例如：林營運總監"
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label htmlFor="email" className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            電子郵件
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password" className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            密碼
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="請設定至少 12 個字元"
              minLength={12}
              className="pr-10"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 bg-transparent border-0 cursor-pointer"
              aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="field-hint">
            安全性要求：密碼長度至少 12 個字元（目前 {password.length} / 12）。
          </p>

          {error && <p className="error-message" role="alert">{error}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? '建立帳戶中…' : '建立帳戶並登入'}
          </button>
        </form>

        <p className="auth-link">
          已經有帳號？<Link to="/login">返回登入</Link>
        </p>
      </main>
    </div>
  );
}
