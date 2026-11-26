// 提供登入表單,並在登入成功後返回原本要前往的頁面
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, Building2, TrendingUp, Wrench } from 'lucide-react';
import { useAuth } from './AuthContext';
import ThemeToggle from '@/components/button/ThemeToggle';

export default function LoginPage() {
  const { login, status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      const requestedPath = location.state?.from?.pathname;
      navigate(requestedPath?.startsWith('/') ? requestedPath : '/', {
        replace: true,
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || '登入失敗，請確認伺服器連線後重試。'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 flex items-center justify-center p-6 overflow-hidden">
      <div className="fixed top-5 right-5 z-20">
        <ThemeToggle showLabel />
      </div>
      {/* 背景環境光暈 */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-4xl grid lg:grid-cols-12 gap-8 items-center">
        {/* 左側品牌資訊區 */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-6">
          <div className="flex items-center space-x-3.5">
            <div className="brand-logo w-12 h-12 rounded-2xl shadow-amber-500/25">
              <ShieldCheck className="w-7 h-7 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-extrabold text-xl tracking-wider text-slate-900 dark:text-slate-100">
                房屋人資產
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400/90 font-medium tracking-wide">
                智慧物業包租代管系統 • Enterprise SaaS
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-snug">
              一站式掌控房態、租金收益與管家派工
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              專為包租代管團隊打造的資產營運中樞，即時追蹤託管出租率、逾期催繳預警與財務收支損益。
            </p>
          </div>

          <div className="grid gap-3 pt-2">
            <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white/90 dark:border-slate-800/80 dark:bg-[#0B1120]/80 p-3.5">
              <div className="kpi-icon-box rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">房態與資產全景盤</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">即時掌握出租、空置、即將到期與欠繳戶況</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white/90 dark:border-slate-800/80 dark:bg-[#0B1120]/80 p-3.5">
              <div className="kpi-icon-box rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">財務收支與坪效分析</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">視覺化呈現應收實收對比與房型收益結構</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white/90 dark:border-slate-800/80 dark:bg-[#0B1120]/80 p-3.5">
              <div className="kpi-icon-box rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">管家報修與點交派工</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">從房態抽屜一鍵派工，追蹤修繕進度與費用</div>
              </div>
            </div>
          </div>
        </div>

        {/* 右側登入卡片 */}
        <div className="lg:col-span-6 flex justify-center">
          <main className="auth-card w-full">
            <div className="flex lg:hidden items-center space-x-3 mb-6">
              <div className="brand-logo">
                <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <div className="font-extrabold text-base text-slate-900 dark:text-slate-100">房屋人資產</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">智慧物業包租代管系統</div>
              </div>
            </div>

            <p className="eyebrow">帳戶安全驗證</p>
            <h1>登入管理</h1>
            <p className="description">請使用已授權的物業管理師帳戶登入系統。</p>

            {status === 'error' && (
              <p className="error-message" role="alert">
                無法連線至登入服務，請確認後端伺服器已啟動。
              </p>
            )}

            <form onSubmit={handleSubmit}>
              <label htmlFor="email" className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                電子郵件
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
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
                  autoComplete="current-password"
                  placeholder="請輸入登入密碼"
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

              {error && <p className="error-message" role="alert">{error}</p>}

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? '驗證登入中…' : '登入系統'}
              </button>
            </form>

            <p className="auth-link">
              還沒有管理帳號？<Link to="/register">立即註冊</Link>
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
