import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    LayoutGrid,
    LogIn,
    Map as MapIcon,
    ShieldCheck,
    UserPlus,
} from 'lucide-react';
import ThemeToggle from '@/components/button/ThemeToggle';

function header({ authStatus, user }) {
    const location = useLocation();
    const isListPage = location.pathname === '/';
    const isMapPage = location.pathname === '/map';

    return (
        <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/85 dark:border-slate-800/80 dark:bg-[#090d16]/85 backdrop-blur-md">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-6">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="brand-logo group-hover:scale-105 transition">
                            <ShieldCheck className="h-6 w-6 stroke-[2.4]" />
                        </div>
                        <div>
                            <div className="font-extrabold text-base sm:text-lg tracking-wide text-slate-900 dark:text-slate-100 leading-tight">
                                房屋人資產
                            </div>
                            <div className="text-[11px] text-amber-600 dark:text-amber-400/90 font-medium tracking-wide">
                                精選招租平台 • 即時空房查詢
                            </div>
                        </div>
                    </Link>

                    <div className="hidden sm:flex items-center rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/70 p-1 gap-1">
                        <Link
                            to="/"
                            className={`tab-btn font-semibold ${isListPage ? 'tab-btn-active' : ''}`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            <span>列表找房</span>
                        </Link>
                        <Link
                            to="/map"
                            className={`tab-btn font-semibold ${isMapPage ? 'tab-btn-active' : ''}`}
                        >
                            <MapIcon className="h-3.5 w-3.5" />
                            <span>地圖找房</span>
                        </Link>
                    </div>
                </div>

                <nav className="flex items-center gap-2.5 sm:gap-3">
                    <ThemeToggle />
                    {authStatus === 'authenticated' ? (
                        <>
                            {user?.name && (
                                <span className="hidden sm:inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                                    您好，{user.name}
                                </span>
                            )}
                            <Link
                                to="/admin"
                                className="btn-primary gap-2 px-4 py-2 text-xs sm:text-sm"
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                管理後台
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="btn-secondary rounded-xl px-3.5 py-2 sm:text-sm"
                            >
                                <LogIn className="h-4 w-4" />
                                <span>房東／管理員登入</span>
                            </Link>
                            <Link
                                to="/register"
                                className="btn-primary px-3.5 py-2 text-xs sm:text-sm"
                            >
                                <UserPlus className="h-4 w-4" />
                                <span>註冊</span>
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    )
}
export default header;