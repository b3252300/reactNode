import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "@/components/box/Card";
import ButtonTag from "@/components/button/Button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
import {
  createButlerRepairRequestApi,
  getButlerRepairRequestsApi,
  updateButlerRepairRequestApi,
} from "@/api/butlerRepairRequest";
import type {
  CreateRepairTicketInput,
  RepairRoomOption,
  RepairTicket,
  RepairTicketCounts,
  TicketStatus,
} from "@/types/butlerRepairRequest";
import EditDialog, { type RepairTicketFormState } from "./EditDialog";

const EMPTY_COUNTS: RepairTicketCounts = {
  all: 0,
  pending: 0,
  in_progress: 0,
  completed: 0,
  totalCost: 0,
};

function ButlerRepairRequestList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [roomOptions, setRoomOptions] = useState<RepairRoomOption[]>([]);
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [counts, setCounts] = useState<RepairTicketCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const getTabClass = (status: "all" | TicketStatus) =>
    statusFilter === status
      ? "tab-btn-soft-active shadow-sm"
      : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/60 dark:hover:text-slate-200";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitialValues, setDialogInitialValues] = useState<
    Partial<RepairTicketFormState> | undefined
  >(undefined);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const loadRepairRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getButlerRepairRequestsApi();
      setTickets(res.tickets);
      setCounts(res.counts);
      setRoomOptions(res.roomOptions);
    } catch (err) {
      console.error("載入報修派工單失敗：", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRepairRequests();
  }, [loadRepairRequests]);

  // 若從「房態與資產盤」抽屜點擊「指派管家勘查或點交」跳轉過來，自動開啟派工視窗並帶入房號
  useEffect(() => {
    const room = searchParams.get("room");
    if (room) {
      const address = searchParams.get("address") || "";
      const tenant = searchParams.get("tenant") || "";
      setDialogInitialValues({
        roomNumber: room,
        address,
        tenantName: tenant,
        category: "退租點交",
        title: `房號 ${room} 現場屋況勘查與設備點交`,
        priority: "inspection",
      });
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredTickets = useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const handleCreateTicket = async (payload: CreateRepairTicketInput) => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      const newTicket = await createButlerRepairRequestApi(payload);
      setDialogOpen(false);
      await loadRepairRequests();
      window.dispatchEvent(new CustomEvent("butler-repair-updated"));
      notify(`已建立派工單 ${newTicket.ticketCode} 並通知 ${newTicket.butlerName}`);
    } catch (err) {
      console.error("建立派工單失敗：", err);
      notify("建立派工單失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceTicketStatus = async (ticket: RepairTicket) => {
    const nextStatus: TicketStatus =
      ticket.status === "pending" ? "in_progress" : "completed";
    try {
      await updateButlerRepairRequestApi(ticket.id, { status: nextStatus });
      await loadRepairRequests();
      window.dispatchEvent(new CustomEvent("butler-repair-updated"));
      notify(
        nextStatus === "in_progress"
          ? `工單 ${ticket.ticketCode} 已轉為「管家勘查處理中」`
          : `工單 ${ticket.ticketCode} 已驗收完修結案`
      );
    } catch (err) {
      console.error("更新工單狀態失敗：", err);
      notify("更新工單狀態失敗，請稍後再試");
    }
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
            setDialogInitialValues({
              roomNumber: roomOptions[0]?.roomNumber || "",
              address: roomOptions[0]?.address || "",
              tenantName: roomOptions[0]?.tenantName || "",
              category: "",
              title: "",
              butlerName: "",
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
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5 flex-col gap-3">
              <Skeleton className="h-5 w-32 bg-slate-800" />
              <Skeleton className="h-6 w-3/4 bg-slate-800" />
              <Skeleton className="h-16 w-full bg-slate-800" />
            </Card>
          ))}
        </div>
      ) : (
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
                      {ticket.ticketCode}
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
                    onClick={() => void advanceTicketStatus(ticket)}
                  >
                    {ticket.status === "pending" ? "開始派工處理" : "標記完修結案"}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <EditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        roomOptions={roomOptions}
        initialValues={dialogInitialValues}
        submitting={submitting}
        onSubmit={handleCreateTicket}
      />
    </div>
  );
}

export default ButlerRepairRequestList;
