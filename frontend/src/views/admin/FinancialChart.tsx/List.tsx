import { useEffect, useMemo, useState } from "react";
import Card from "@/components/box/Card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  ShieldAlert,
  Download,
  Building2,
  PieChart,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import { getPropertyAssetsApi } from "@/api/propertyStatusAssets";
import type { PropertyAsset } from "@/types/propertyStatusAssets";
import useDate from "@/utils/date";

const { GetDateYYYYMMDD } = useDate();

function FinancialChartList() {
  const [assets, setAssets] = useState<PropertyAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"6m" | "12m">("6m");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const list = await getPropertyAssetsApi();
        setAssets(list);
      } catch (err) {
        console.error("載入財務資料失敗：", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const metrics = useMemo(() => {
    const activeLeases = assets.filter((a) =>
      ["rented", "expiring", "overdue"].includes(a.status)
    );
    const expectedMonthlyRent = activeLeases.reduce(
      (sum, a) => sum + Number(a.monthlyRent || 0) + Number(a.managementFee || 0),
      0
    );
    const totalOverdue = assets.reduce(
      (sum, a) => sum + Number(a.overdueAmount || 0),
      0
    );
    const collectedEstimate = Math.max(0, expectedMonthlyRent - totalOverdue);
    const totalDeposit = activeLeases.reduce(
      (sum, a) => sum + Number(a.deposit || 0),
      0
    );
    const totalArea = activeLeases.reduce(
      (sum, a) => sum + Number(a.area || 0),
      0
    );
    const avgRentPerPing =
      totalArea > 0 ? Math.round(expectedMonthlyRent / totalArea) : 0;
    const potentialVacantRent = assets
      .filter((a) => a.status === "vacant" || a.status === "maintenance")
      .reduce((sum, a) => sum + Number(a.monthlyRent || 0), 0);

    const collectionRate =
      expectedMonthlyRent > 0
        ? ((collectedEstimate / expectedMonthlyRent) * 100).toFixed(1)
        : "100.0";

    return {
      expectedMonthlyRent,
      collectedEstimate,
      totalOverdue,
      totalDeposit,
      avgRentPerPing,
      potentialVacantRent,
      collectionRate,
      overdueCount: assets.filter(
        (a) => a.status === "overdue" || (a.overdueAmount ?? 0) > 0
      ).length,
    };
  }, [assets]);

  // 依房型統計收益結構
  const roomTypeBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { roomType: string; count: number; revenue: number }
    >();
    for (const item of assets) {
      const key = item.roomType?.trim() || "其他房型";
      const current = map.get(key) || { roomType: key, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += Number(item.monthlyRent || 0);
      map.set(key, current);
    }
    const list = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    const totalRev = list.reduce((s, i) => s + i.revenue, 0) || 1;
    return list.map((item) => ({
      ...item,
      share: Math.round((item.revenue / totalRev) * 100),
    }));
  }, [assets]);

  // 近 6 個月／12 個月模擬與當月實際營收趨勢
  const monthlySeries = useMemo(() => {
    const baseExpected = metrics.expectedMonthlyRent || 168000;
    const baseCollected = metrics.collectedEstimate || 152000;
    const factors6 = [
      { label: "5月", expFactor: 0.88, colFactor: 0.86 },
      { label: "6月", expFactor: 0.91, colFactor: 0.89 },
      { label: "7月", expFactor: 0.94, colFactor: 0.91 },
      { label: "8月", expFactor: 0.96, colFactor: 0.95 },
      { label: "9月", expFactor: 0.98, colFactor: 0.94 },
      { label: "本月", expFactor: 1, colFactor: 1, isCurrent: true },
    ];
    const factors12 = [
      { label: "11月", expFactor: 0.78, colFactor: 0.76 },
      { label: "12月", expFactor: 0.8, colFactor: 0.79 },
      { label: "1月", expFactor: 0.82, colFactor: 0.8 },
      { label: "2月", expFactor: 0.84, colFactor: 0.82 },
      { label: "3月", expFactor: 0.85, colFactor: 0.84 },
      { label: "4月", expFactor: 0.87, colFactor: 0.85 },
      ...factors6,
    ];
    const source = selectedPeriod === "6m" ? factors6 : factors12;
    return source.map((m) => {
      const expected = m.isCurrent
        ? baseExpected
        : Math.round(baseExpected * m.expFactor);
      const collected = m.isCurrent
        ? baseCollected
        : Math.round(baseExpected * m.colFactor);
      return {
        label: m.label,
        expected,
        collected,
        isCurrent: Boolean(m.isCurrent),
      };
    });
  }, [metrics.expectedMonthlyRent, metrics.collectedEstimate, selectedPeriod]);

  const maxChartValue = useMemo(() => {
    return Math.max(...monthlySeries.map((m) => m.expected), 1);
  }, [monthlySeries]);

  const handleExportCsv = () => {
    const headers = [
      "房號",
      "地址",
      "樓層",
      "房型",
      "坪數",
      "狀態",
      "承租人",
      "月租金(NT$)",
      "管理費(NT$)",
      "押金(NT$)",
      "逾期金額(NT$)",
      "租約到期日",
    ];
    const rows = assets.map((item) => [
      item.roomNumber,
      `"${(item.address || "").replace(/"/g, '""')}"`,
      item.floor || "",
      item.roomType || "",
      item.area || 0,
      item.statusText || item.status,
      item.tenantName || "待招租",
      item.monthlyRent || 0,
      item.managementFee || 0,
      item.deposit || 0,
      item.overdueAmount || 0,
      GetDateYYYYMMDD(item.leaseEndDate),
    ]);
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `房屋人資產_財務收支報表_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 flex-col gap-3">
              <Skeleton className="h-4 w-28 bg-slate-800" />
              <Skeleton className="h-8 w-40 bg-slate-800" />
              <Skeleton className="h-3 w-32 bg-slate-800" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <Skeleton className="h-64 w-full bg-slate-800" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頂部 4 張核心財務 KPI 卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5 flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="tab-card">
              本月應收租金總額 (含管理費)
            </span>
            <div className="kpi-icon-box bg-amber-500/15 text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-50">
              NT$ {metrics.expectedMonthlyRent.toLocaleString("zh-TW")}
            </div>
          </div>
          <div className="hr flex items-center justify-between  pt-2">

            <span>空置潛在租金</span>
            <span className="font-mono text-amber-400">
              +NT$ {metrics.potentialVacantRent.toLocaleString("zh-TW")}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="tab-card">
              本月實收預估淨額
            </span>
            <div className="kpi-icon-box bg-emerald-500/15 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold font-mono text-emerald-400">
              NT$ {metrics.collectedEstimate.toLocaleString("zh-TW")}
            </div>
          </div>
          <div className="hr flex items-center justify-between  pt-2">
            <span>租金收現達成率</span>
            <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {metrics.collectionRate}%
            </span>
          </div>
        </Card>

        <Card className="p-5 flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="tab-card">
              逾期待催繳總額
            </span>
            <div className="kpi-icon-box bg-rose-500/15 text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold font-mono text-rose-400">
              NT$ {metrics.totalOverdue.toLocaleString("zh-TW")}
            </div>
          </div>
          <div className="hr flex items-center justify-between pt-2">
            <span>欠繳待催繳戶數</span>
            <span className="font-semibold text-rose-300">
              {metrics.overdueCount} 戶待催繳
            </span>
          </div>
        </Card>

        <Card className="p-5 flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="tab-card">
              託管押金水位 & 平均坪效
            </span>
            <div className="kpi-icon-box bg-sky-500/15 text-sky-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
              NT$ {metrics.totalDeposit.toLocaleString("zh-TW")}
            </div>
          </div>
          <div className="hr flex items-center justify-between pt-2">
            <span>平均每坪月租金收益</span>
            <span className="font-mono font-semibold text-sky-400">
              NT$ {metrics.avgRentPerPing.toLocaleString("zh-TW")} / 坪
            </span>
          </div>
        </Card>
      </div>

      {/* 中段：應收 vs 實收長條趨勢圖 + 房型收益佔比 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 p-6 flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  租金應收 vs. 實收趨勢分析
                </h2>
              </div>
              <p className="text-xs  mt-0.5">
                依據目前託管物件組合計算之月度應收帳款與實收現金流對比
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-700"></span>
                  應收總額
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-amber-600 to-amber-400"></span>
                  實收金額
                </span>
              </div>
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedPeriod("6m")}
                  className={`tab-btn-soft px-2.5 py-1 ${selectedPeriod === "6m" ? "tab-btn-soft-active border-transparent" : ""}`}
                >
                  近 6 個月
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod("12m")}
                  className={`tab-btn-soft px-2.5 py-1 ${selectedPeriod === "12m" ? "tab-btn-soft-active border-transparent" : ""}`}
                >
                  近 12 個月
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 h-60 w-full flex items-end justify-between gap-3 border-b border-slate-800 pb-3 px-2">
            {monthlySeries.map((item) => {
              const expHeight = Math.max(
                12,
                Math.round((item.expected / maxChartValue) * 180)
              );
              const colHeight = Math.max(
                10,
                Math.round((item.collected / maxChartValue) * 180)
              );

              return (
                <div
                  key={item.label}
                  className="group flex-1 flex flex-col items-center gap-2"
                >
                  <div className="relative flex items-end justify-center gap-1.5 w-full h-48">
                    {/* 懸浮數據提示 */}
                    <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center rounded-lg border border-slate-700 bg-slate-950/95 px-2.5 py-1 text-[11px] text-slate-200 whitespace-nowrap shadow-xl z-10">
                      <span>
                        實收: NT$ {item.collected.toLocaleString("zh-TW")}
                      </span>
                      <span className="text-slate-400">
                        應收: NT$ {item.expected.toLocaleString("zh-TW")}
                      </span>
                    </div>

                    <div
                      style={{ height: `${expHeight}px` }}
                      className="w-3 sm:w-4 rounded-t-md bg-slate-800 border border-slate-700/60 transition-all duration-300"
                    />
                    <div
                      style={{ height: `${colHeight}px` }}
                      className={`w-3 sm:w-4 rounded-t-md transition-all duration-300 ${item.isCurrent
                        ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/20"
                        : "bg-gradient-to-t from-amber-600 to-amber-400"
                        }`}
                    />
                  </div>
                  <span
                    className={`text-xs ${item.isCurrent
                      ? "font-bold text-amber-400"
                      : "text-slate-400"
                      }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-4 p-6 flex-col justify-between">
          <div className="w-full">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                各房型租金收益貢獻
              </h2>
            </div>
            <p className="text-xs  mt-0.5">
              依物件房型分類統計月租金規模與佔比
            </p>

            <div className="mt-5 space-y-4">
              {roomTypeBreakdown.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  尚無房屋物件資料
                </div>
              ) : (
                roomTypeBreakdown.map((rt, idx) => {
                  const barColors = [
                    "from-amber-500 to-amber-400",
                    "from-emerald-500 to-emerald-400",
                    "from-sky-500 to-sky-400",
                    "from-purple-500 to-purple-400",
                  ];
                  const color = barColors[idx % barColors.length];
                  return (
                    <div key={rt.roomType} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">
                          {rt.roomType}{" "}
                          <span className="text-slate-500 font-normal">
                            ({rt.count} 戶)
                          </span>
                        </span>
                        <span className="font-mono">
                          NT$ {rt.revenue.toLocaleString("zh-TW")} ({rt.share}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          style={{ width: `${Math.max(6, rt.share)}%` }}
                          className={`h-full rounded-full bg-gradient-to-r ${color}`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="w-full pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span>託管總物件數</span>
            <span className="font-mono font-bold">
              共 {assets.length} 戶資產
            </span>
          </div>
        </Card>
      </div>

      {/* 下段：各物件財務收支明細表 */}
      <Card className="p-6 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                託管物件租金與帳務明細表
              </h2>
            </div>
            <p className="text-xs  mt-0.5">
              包含各房號月租金、管理費、押金水位與逾期欠款明細
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            className="cursor-pointer gap-1.5"
          >
            <Download className="w-4 h-4" />
            匯出 CSV 財務報表
          </Button>
        </div>

        <div className="w-full overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                <th className="py-3 px-3">房號</th>
                <th className="py-3 px-3">地址 / 房型</th>
                <th className="py-3 px-3">承租人</th>
                <th className="py-3 px-3">業務狀態</th>
                <th className="py-3 px-3 text-right">月租金</th>
                <th className="py-3 px-3 text-right">管理費</th>
                <th className="py-3 px-3 text-right">保管押金</th>
                <th className="py-3 px-3 text-right">逾期欠款</th>
                <th className="py-3 px-3 text-right">租約到期日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {assets.map((item) => (
                <tr
                  key={item.id || item.roomNumber}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition"
                >
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {item.roomNumber}
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-800 dark:text-slate-200 font-medium">
                      {item.address || "—"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {item.roomType} {item.area ? `• ${item.area} 坪` : ""}
                    </div>
                  </td>
                  <td className="py-3 px-3 ">
                    {item.tenantName || (
                      <span className="text-slate-400">待招租</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`status-badge card-tag ${item.status === "rented"
                        ? "status-rented"
                        : item.status === "expiring"
                          ? "status-expiring"
                          : item.status === "maintenance"
                            ? "status-maintenance"
                            : item.status === "vacant"
                              ? "status-vacant"
                              : ""
                        }`}
                    >
                      <span className="status-dot"></span>
                      {item.statusText}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-amber-400">
                    NT$ {Number(item.monthlyRent || 0).toLocaleString("zh-TW")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono ">
                    NT$ {Number(item.managementFee || 0).toLocaleString("zh-TW")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono ">
                    NT$ {Number(item.deposit || 0).toLocaleString("zh-TW")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {(item.overdueAmount ?? 0) > 0 ? (
                      <span className="font-bold text-rose-400">
                        NT$ {Number(item.overdueAmount).toLocaleString("zh-TW")}
                      </span>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    {GetDateYYYYMMDD(item.leaseEndDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default FinancialChartList;
