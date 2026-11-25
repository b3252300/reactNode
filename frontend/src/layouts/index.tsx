import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
} from "@/components/ui/sidebar";
import Calendar from "@/components/icon/Calendar";
import { Outlet, useLocation, useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { AppSidebar } from "./component/app-sidebar";
import ThemeToggle from "@/components/button/ThemeToggle";
import { useAuth } from "@/views/auth/AuthContext";
import { getPropertyAssetsApi } from "@/api/propertyStatusAssets";
import type { PropertyAsset } from "@/types/propertyStatusAssets";

const PAGE_TITLES: Record<string, string> = {
  "/": "首頁",
  "/property-status-assets": "房態與資產全景盤",
  "/propertyStatusAssets": "房態與資產全景盤",
  "/financial-chart": "財務收支與收益圖表",
  "/butler-repair-request": "管家報修與派工中心",
  "/members": "管理團隊與權限名冊",

};

function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth() as {
    user: { name?: string; email?: string } | null;
    logout: () => Promise<void>;
  };
  const [error, setError] = useState("");
  const [assets, setAssets] = useState<PropertyAsset[]>([]);

  const fetchHeaderStats = useCallback(async () => {
    try {
      const list = await getPropertyAssetsApi();
      setAssets(list);
    } catch {
      // 若尚未有資料或失敗則保持現狀
    }
  }, []);

  useEffect(() => {
    void fetchHeaderStats();
    const handleAssetsUpdated = () => {
      void fetchHeaderStats();
    };
    window.addEventListener("property-assets-updated", handleAssetsUpdated);
    return () => {
      window.removeEventListener("property-assets-updated", handleAssetsUpdated);
    };
  }, [fetchHeaderStats]);

  const stats = useMemo(() => {
    const total = assets.length;
    if (total === 0) {
      return {
        occupancyRate: "0.0%",
        overdueCount: 0,
        overdueTotal: 0,
        maintenanceCount: 0,
      };
    }
    const occupiedCount = assets.filter((item) =>
      ["rented", "expiring", "overdue"].includes(item.status)
    ).length;
    const overdueItems = assets.filter(
      (item) => item.status === "overdue" || (item.overdueAmount ?? 0) > 0
    );
    const overdueTotal = overdueItems.reduce(
      (sum, item) => sum + Number(item.overdueAmount || 0),
      0
    );
    const maintenanceCount = assets.filter(
      (item) => item.status === "maintenance"
    ).length;

    return {
      occupancyRate: `${((occupiedCount / total) * 100).toFixed(1)}%`,
      overdueCount: overdueItems.length,
      overdueTotal,
      maintenanceCount,
    };
  }, [assets]);

  const currentPeriod = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${yyyy}.${mm} 營運結算週期`;
  }, []);

  async function handleLogout() {
    setError("");
    try {
      await logout();
    } catch {
      setError("無法聯絡伺服器撤銷登入憑證，請稍後重試。");
    }
  }

  const pageTitle = PAGE_TITLES[pathname] || "房態與資產全景盤";

  return (
    <SidebarProvider>
      <AppSidebar
        activePath={pathname}
        handleSidebarClick={(path) => navigate(path)}
        assetCount={assets.length}
        pendingRepairCount={stats.maintenanceCount}
        userName={user?.name}
        userEmail={user?.email}
      />

          <main className="main-container min-h-screen flex flex-col">
            <SidebarHeader className="menu-header sticky top-0 z-20 backdrop-blur-md">
              <div className="header-title-group">
                <SidebarTrigger className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white" />
                <h1>{pageTitle}</h1>
              </div>

              <div className="header-stats-group">
                <div className="header-stat-list">
                  <div className="header-stat-item text-sm">
                    <span>託管出租率:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {stats.occupancyRate}
                      </span>
                  </div>
                  <div className="header-divider" />
                  <div className="header-stat-item text-sm">
                    <span>逾期待催繳:</span>
                    <span
                  className={`font-bold ${stats.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"
                        }`}
                    >
                      {stats.overdueCount} 戶 (NT${" "}
                      {stats.overdueTotal.toLocaleString("zh-TW")})
                    </span>
                  </div>
                </div>

                <div className="header-period-badge !text-xs">
                  <Calendar />
                  <span>{currentPeriod}</span>
                </div>
              </div>

              <div className="header-tools-group flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                    <span>你好，{user?.name || user?.email || "管理員"}</span>
                  </div>
                  <ThemeToggle />
                  <button
                    type="button"
                    className="secondary-button flex items-center gap-1.5"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>登出</span>
                  </button>
                </div>
            </SidebarHeader>

            {error && (
              <div className="mx-8 mt-4">
                <p className="error-message" role="alert">
                  {error}
                </p>
              </div>
            )}

            <div className="content-container flex-1">
              <Outlet />
            </div>
          </main>
        </SidebarProvider>
        );
}

        export default Layout;
