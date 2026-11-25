import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "@/components/box/Card";
import ButtonTag from "@/components/button/Button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wrench,
  PlusIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  MapPin,
  Calendar,
} from "lucide-react";
import { getPropertyAssetsApi } from "@/api/propertyStatusAssets";
import type { PropertyAsset } from "@/types/propertyStatusAssets";

type TicketStatus = "pending" | "in_progress" | "completed";
type TicketPriority = "urgent" | "normal" | "inspection";

interface RepairTicket {
  id: string;
  roomNumber: string;
  address: string;
  tenantName: string;
  category: string;
  title: string;
  butlerName: string;
  priority: TicketPriority;
  status: TicketStatus;
  estimatedCost: number;
  createdAt: string;
}

const STORAGE_KEY = "property_butler_repair_tickets_v1";

const DEFAULT_TICKETS: RepairTicket[] = [
  {
    id: "WO-202610-01",
    roomNumber: "A261015-3821",
    address: "台北市信義區松仁路 100 號 7F",
    tenantName: "陳冠宇",
    category: "家電冷氣",
    title: "主臥變頻冷氣滴水暨冷媒壓力檢測",
    butlerName: "張志豪 管家",
    priority: "urgent",
    status: "in_progress",
    estimatedCost: 2800,
    createdAt: "2026/10/18",
  },
  {
    id: "WO-202610-02",
    roomNumber: "A261012-7104",
    address: "台北市大安區敦化南路二段 58 號 11F",
    tenantName: "林雅婷",
    category: "水電修繕",
    title: "乾濕分離浴室矽利康發霉重打與排水疏通",
    butlerName: "王建銘 管家",
    priority: "normal",
    status: "pending",
    estimatedCost: 1500,
    createdAt: "2026/10/19",
  },
  {
    id: "WO-202610-03",
    roomNumber: "A260928-1942",
    address: "新北市板橋區文化路一段 220 號 5F",
    tenantName: "黃柏翰",
    category: "退租點交",
    title: "租約期滿退租屋況勘查、水電抄表與鑰匙點交",
    butlerName: "陳品妤 管家",
    priority: "inspection",
    status: "completed",
    estimatedCost: 0,
    createdAt: "2026/10/15",
  },
];

const inputClass = "form-input";

function ButlerRepairRequestList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [assets, setAssets] = useState<PropertyAsset[]>([]);
  const [tickets, setTickets] = useState<RepairTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_TICKETS;
  });

  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const getTabClass = (status: "all" | TicketStatus) =>
    statusFilter === status
      ? "tab-btn-soft-active shadow-sm"
      : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/60 dark:hover:text-slate-200";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    roomNumber: "",
    address: "",
    tenantName: "",
    category: "水電修繕",
    title: "",
    butlerName: "張志豪 管家",
    priority: "normal" as TicketPriority,
    estimatedCost: 1200,
  });

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch {
      // ignore
    }
  }, [tickets]);

  useEffect(() => {
    async function loadAssets() {
      try {
        const list = await getPropertyAssetsApi();
        setAssets(list);

        // 若有裝修維護中的物件尚未建立工單，自動同步進工單列表
        const maintenanceAssets = list.filter(
          (a) => a.status === "maintenance"
        );
        if (maintenanceAssets.length > 0) {
          setTickets((prev) => {
            const existingRooms = new Set(prev.map((t) => t.roomNumber));
            const additions: RepairTicket[] = [];
            for (const asset of maintenanceAssets) {
              if (!existingRooms.has(asset.roomNumber)) {
                additions.push({
                  id: `WO-${asset.roomNumber}`,
                  roomNumber: asset.roomNumber,
                  address: asset.address || "託管地址",
                  tenantName: asset.tenantName || "裝修空置",
                  category: "裝修維護",
                  title:
                    asset.maintenanceReason ||
                    "全室定期裝修維護與設備翻新工程",
                  butlerName: "張志豪 管家",
                  priority: "normal",
                  status: "in_progress",
                  estimatedCost: 4500,
                  createdAt: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
                });
              }
            }
            return additions.length > 0 ? [...additions, ...prev] : prev;
          });
        }
      } catch {
        // ignore
      }
    }
    void loadAssets();
  }, []);

  // 若從「房態與資產盤」抽屜點擊「指派管家勘查或點交」跳轉過來，自動開啟派工視窗並帶入房號
  useEffect(() => {
    const room = searchParams.get("room");
    if (room) {
      const address = searchParams.get("address") || "";
      const tenant = searchParams.get("tenant") || "";
      setForm((prev) => ({
        ...prev,
        roomNumber: room,
        address,
        tenantName: tenant,
        category: "退租點交",
        title: `房號 ${room} 現場屋況勘查與設備點交`,
        priority: "inspection",
      }));
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredTickets = useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: tickets.length,
      pending: tickets.filter((t) => t.status === "pending").length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      completed: tickets.filter((t) => t.status === "completed").length,
      totalCost: tickets.reduce((s, t) => s + Number(t.estimatedCost || 0), 0),
    };
  }, [tickets]);

  const handleSelectAssetRoom = (roomNumber: string) => {
    const matched = assets.find((a) => a.roomNumber === roomNumber);
    if (matched) {
      setForm((prev) => ({
        ...prev,
        roomNumber: matched.roomNumber,
        address: matched.address || prev.address,
        tenantName: matched.tenantName || prev.tenantName,
      }));
    } else {
      setForm((prev) => ({ ...prev, roomNumber }));
    }
  };

  const handleCreateTicket = () => {
    if (!form.roomNumber.trim() || !form.title.trim()) {
      return;
    }
    const newTicket: RepairTicket = {
      id: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
      roomNumber: form.roomNumber.trim(),
      address: form.address.trim() || "未填寫地址",
      tenantName: form.tenantName.trim() || "無特定房客",
      category: form.category,
      title: form.title.trim(),
      butlerName: form.butlerName,
      priority: form.priority,
      status: "pending",
      estimatedCost: Number(form.estimatedCost) || 0,
      createdAt: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
    };
    setTickets((prev) => [newTicket, ...prev]);
    setDialogOpen(false);
    notify(`已建立派工單 ${newTicket.id} 並通知 ${newTicket.butlerName}`);
  };

  const advanceTicketStatus = (ticket: RepairTicket) => {
    const nextStatus: TicketStatus =
      ticket.status === "pending" ? "in_progress" : "completed";
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, status: nextStatus } : t))
    );
    notify(
      nextStatus === "in_progress"
        ? `工單 ${ticket.id} 已轉為「管家勘查處理中」`
        : `工單 ${ticket.id} 已驗收完修結案`
    );
  };



  return (
    <div className="space-y-6">
      {toast && (
        <div className="toast-success">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* 頂部派工統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="tab-card">
              待指派／待處理工單
            </span>
            <div className="kpi-icon-box bg-rose-500/15 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-400 my-1">
            {counts.pending} 件
          </div>
          <span className="tab-card">
            建議於 24 小時內完成管家派工聯繫
          </span>
        </Card>

        <Card className="p-5 flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="tab-card">
              管家勘查修繕中
            </span>
            <div className="kpi-icon-box bg-amber-500/15 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-400 my-1">
            {counts.in_progress} 件
          </div>
          <span className="tab-card">
            現場廠商與外勤管家跟進中
          </span>
        </Card>

        <Card className="p-5 flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="tab-card">
              本月已完修結案
            </span>
            <div className="kpi-icon-box bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 my-1">
            {counts.completed} 件
          </div>
          <span className="tab-card">
            平均完修滿意度 4.9 / 5.0
          </span>
        </Card>

        <Card className="p-5 flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="tab-card">
              工單預估修繕總費用
            </span>
            <div className="kpi-icon-box bg-purple-500/15 text-purple-400">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100 my-1">
            NT$ {counts.totalCost.toLocaleString("zh-TW")}
          </div>
          <span className="tab-card">
            可列入包租代管年度修繕折抵
          </span>
        </Card>
      </div>

      {/* 篩選列與新增派工按鈕 */}
      <Card className="p-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <ButtonTag
            onClick={() => setStatusFilter("all")}
            className={`${getTabClass("all")} text-sm dark:text-white`}
          >
            全部工單 ({counts.all})
          </ButtonTag>
          <ButtonTag
            onClick={() => setStatusFilter("pending")}
            className={`${getTabClass("pending")} text-sm dark:text-white`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            待派工 ({counts.pending})
          </ButtonTag>
          <ButtonTag
            onClick={() => setStatusFilter("in_progress")}
            className={`${getTabClass("in_progress")} text-sm dark:text-white`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            勘查修繕中 ({counts.in_progress})
          </ButtonTag>
          <ButtonTag
            onClick={() => setStatusFilter("completed")}
            className={`${getTabClass("completed")} text-sm dark:text-white`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            已完修結案 ({counts.completed})
          </ButtonTag>
        </div>

        <Button
          className="btn-primary font-semibold cursor-pointer"
          onClick={() => {
            setForm({
              roomNumber: assets[0]?.roomNumber || "",
              address: assets[0]?.address || "",
              tenantName: assets[0]?.tenantName || "",
              category: "水電修繕",
              title: "",
              butlerName: "張志豪 管家",
              priority: "normal",
              estimatedCost: 1200,
            });
            setDialogOpen(true);
          }}
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          新增報修／點交派工
        </Button>
      </Card>

      {/* 工單卡片清單 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="p-5 flex-col justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <div className="space-y-3 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="badge-amber rounded font-mono font-bold">
                    {ticket.id}
                  </span>
                  <span className="badge-neutral rounded border-transparent">
                    {ticket.category}
                  </span>
                </div>

                <span
                  className={`status-badge card-tag ${ticket.status === "completed"
                    ? "status-rented"
                    : ticket.status === "in_progress"
                      ? "status-expiring"
                      : "status-overdue"
                    }`}
                >
                  <span className="status-dot"></span>
                  {ticket.status === "completed"
                    ? "已完修結案"
                    : ticket.status === "in_progress"
                      ? "勘查修繕中"
                      : "待指派處理"}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {ticket.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    {ticket.roomNumber}
                  </span>
                  <span>•</span>
                  <span className="truncate">{ticket.address}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/80 dark:border-slate-800/80 p-3 text-sm">
                <div>
                  <span className="text-slate-500 block">負責外勤管家</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1 mt-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    {ticket.butlerName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">預估修繕費用</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                    NT$ {ticket.estimatedCost.toLocaleString("zh-TW")}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>立案: {ticket.createdAt}</span>
                <span>•</span>
                <span>房客: {ticket.tenantName}</span>
              </div>

              {ticket.status !== "completed" && (
                <Button
                  size="sm"
                  className="btn-primary h-8 text-xs font-semibold cursor-pointer"
                  onClick={() => advanceTicketStatus(ticket)}
                >
                  {ticket.status === "pending" ? "開始派工處理" : "標記完修結案"}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* 新增報修派工單 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="dialog-surface sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              新增管家報修／點交派工單
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              指派外勤管家前往指定房號進行設備修繕、定期巡檢或退租點交。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="form-label">
                  選擇或輸入房號
                </label>
                {assets.length > 0 ? (
                  <select
                    className={inputClass}
                    value={form.roomNumber}
                    onChange={(e) => handleSelectAssetRoom(e.target.value)}
                  >
                    <option value="">請選擇房號</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.roomNumber}>
                        {a.roomNumber} ({a.roomType})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={inputClass}
                    value={form.roomNumber}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        roomNumber: e.target.value,
                      }))
                    }
                    placeholder="例如 A261015-3821"
                  />
                )}
              </div>

              <div className="grid gap-1.5">
                <label className="form-label">
                  派工類別
                </label>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                >
                  <option value="水電修繕">水電修繕</option>
                  <option value="家電冷氣">家電冷氣</option>
                  <option value="退租點交">退租／入住點交</option>
                  <option value="裝修維護">裝修維護</option>
                  <option value="定期巡檢">定期屋況巡檢</option>
                </select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="form-label">
                地址
              </label>
              <input
                className={inputClass}
                value={form.address}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="請輸入地址"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="form-label">
                報修／派工事項說明
              </label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="例如：主臥冷氣不冷需清洗濾網與檢測冷媒"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <label className="form-label">
                  指派外勤管家
                </label>
                <select
                  className={inputClass}
                  value={form.butlerName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, butlerName: e.target.value }))
                  }
                >
                  <option value="張志豪 管家">張志豪 管家</option>
                  <option value="王建銘 管家">王建銘 管家</option>
                  <option value="陳品妤 管家">陳品妤 管家</option>
                </select>
              </div>

              <div className="grid gap-1.5">
                <label className="form-label">
                  聯絡房客
                </label>
                <input
                  className={inputClass}
                  value={form.tenantName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tenantName: e.target.value }))
                  }
                  placeholder="房客姓名"
                />
              </div>

              <div className="grid gap-1.5">
                <label className="form-label">
                  預估費用 (NT$)
                </label>
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.estimatedCost}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      estimatedCost: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              className="btn-primary font-semibold"
              onClick={handleCreateTicket}
            >
              確認建立派工單
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ButlerRepairRequestList;
