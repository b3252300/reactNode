import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type {
    CreateRepairTicketInput,
    RepairRoomOption,
    TicketPriority,
} from "@/types/butlerRepairRequest";

export interface RepairTicketFormState {
    roomNumber: string; // 房號
    address: string; // 物件地址
    tenantName: string; // 聯絡房客姓名（選擇房號時自動帶入）
    category: string; // 派工類別（如：水電修繕、家電冷氣、退租點交等）
    title: string; // 報修／派工事項說明標題
    butlerName: string; // 指派的外勤管家姓名
    priority: TicketPriority; // 工單優先級（urgent / normal / inspection）
    estimatedCost: number | null; // 預估修繕費用（NT$）
}

interface EditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    roomOptions: RepairRoomOption[];
    initialValues?: Partial<RepairTicketFormState>;
    submitting?: boolean;
    onSubmit: (payload: CreateRepairTicketInput) => Promise<void> | void;
}

const DEFAULT_FORM: RepairTicketFormState = {
    roomNumber: "",
    address: "",
    tenantName: "",
    category: "",
    title: "",
    butlerName: "",
    priority: "normal",
    estimatedCost: null,
};

const inputClass = "form-input";

function EditDialog({
    open,
    onOpenChange,
    roomOptions,
    initialValues,
    submitting = false,
    onSubmit,
}: EditDialogProps) {
    const [form, setForm] = useState<RepairTicketFormState>(DEFAULT_FORM);

    useEffect(() => {
        if (!open) return;
        setForm({
            ...DEFAULT_FORM,
            ...initialValues,
        });
    }, [open, initialValues]);

    const handleSelectAssetRoom = (roomNumber: string) => {
        const matched = roomOptions.find((a) => a.roomNumber === roomNumber);
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

    const handleSubmit = async () => {
        if (!form.roomNumber.trim() || !form.title.trim() || submitting) {
            return;
        }
        await onSubmit({
            roomNumber: form.roomNumber.trim(),
            address: form.address.trim(),
            tenantName: form.tenantName.trim(),
            category: form.category,
            title: form.title.trim(),
            butlerName: form.butlerName,
            priority: form.priority,
            status: "pending",
            estimatedCost: Number(form.estimatedCost) || 0,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                            <label className="form-label">選擇或輸入房號</label>
                            {roomOptions.length > 0 ? (
                                <select
                                    className={inputClass}
                                    value={form.roomNumber}
                                    onChange={(e) => handleSelectAssetRoom(e.target.value)}
                                >
                                    <option value="">請選擇房號</option>
                                    {roomOptions.map((a) => (
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
                            <label className="form-label">派工類別</label>
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
                        <label className="form-label">地址</label>
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
                        <label className="form-label">報修／派工事項說明</label>
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
                            <label className="form-label">指派外勤管家</label>
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
                            <label className="form-label">聯絡房客</label>
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
                            <label className="form-label">預估費用 (NT$)</label>
                            <input
                                type="number"
                                min="0"
                                className={inputClass}
                                value={form.estimatedCost ?? ""}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        estimatedCost:
                                            e.target.value === "" ? null : Number(e.target.value),
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
                        onClick={() => onOpenChange(false)}
                    >
                        取消
                    </Button>
                    <Button
                        type="button"
                        className="btn-primary font-semibold"
                        disabled={submitting}
                        onClick={() => void handleSubmit()}
                    >
                        {submitting ? "建立中..." : "確認建立派工單"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default EditDialog;
