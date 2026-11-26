import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import axios from "axios";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { UploadCloud, X } from "lucide-react";

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
  PropertyAsset,
  PropertyAssetInput,
  PropertyStatus,
} from "@/types/propertyStatusAssets";
import MenuBar from "@/components/button/MenuBar";
import { TAIWAN_CITIES } from "@/constants/taiwanCities";
import { PROPERTY_FEATURES } from "@/constants/propertyFeatures";
import LocationPickerMap from "./LocationPickerMap";

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  initialAsset?: PropertyAsset | null;
  onSubmit: (payload: PropertyAssetInput) => Promise<void> | void;
}

const defaultForm = {
  city: "",
  address: "",
  lat: null as number | null,
  lng: null as number | null,
  floor: "",
  roomType: "",
  status: "vacant" as PropertyStatus,
  tenantName: "",
  tenantPhone: "",
  area: 0,
  monthlyRent: 0,
  deposit: 0,
  managementFee: 0,
  leaseEndDate: "",
  overdueDays: 0,
  overdueAmount: 0,
  maintenanceReason: "",
  notes: "",
  features: [] as number[],
  imageUrl: "",
  imageUrls: [] as string[],
};

function toInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

const inputBaseClass = "form-input";

function EditDialog({
  open,
  onOpenChange,
  isEdit,
  initialAsset,
  onSubmit,
}: EditDialogProps) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const isLeasedStatus = ["rented", "expiring", "overdue"].includes(form.status);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    const existingImages = initialAsset?.imageUrls?.length
      ? initialAsset.imageUrls
      : initialAsset?.imageUrl
        ? [initialAsset.imageUrl]
        : [];
    setImagePreviews(existingImages);

    if (initialAsset) {
      setForm({
        city: initialAsset.city || "",
        address: initialAsset.address || "",
        lat:
          typeof initialAsset.lat === "number" && Number.isFinite(initialAsset.lat)
            ? initialAsset.lat
            : null,
        lng:
          typeof initialAsset.lng === "number" && Number.isFinite(initialAsset.lng)
            ? initialAsset.lng
            : null,
        floor: initialAsset.floor || "",
        roomType: initialAsset.roomType || "",
        status: initialAsset.status,
        tenantName: initialAsset.tenantName || "",
        tenantPhone: initialAsset.tenantPhone || "",
        area: Number(initialAsset.area || 0),
        monthlyRent: Number(initialAsset.monthlyRent || 0),
        deposit: Number(initialAsset.deposit || 0),
        managementFee: Number(initialAsset.managementFee || 0),
        leaseEndDate: toInputDate(initialAsset.leaseEndDate),
        overdueDays: Number(initialAsset.overdueDays || 0),
        overdueAmount: Number(initialAsset.overdueAmount || 0),
        maintenanceReason: initialAsset.maintenanceReason || "",
        notes: initialAsset.notes || "",
        features: Array.isArray(initialAsset.features)
          ? initialAsset.features.map(Number).filter((code) => !Number.isNaN(code))
          : [],
        imageUrl: initialAsset.imageUrl || "",
        imageUrls: existingImages,
      });
      return;
    }

    setForm({ ...defaultForm });
    setImagePreviews([]);
  }, [initialAsset, open]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = 10 - imagePreviews.length;
    if (files.length > remainingSlots) {
      setSubmitError(`最多可新增 10 張圖片，目前剩餘 ${remainingSlots} 張。`);
      return;
    }

    const invalidType = files.find(
      (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );
    if (invalidType) {
      setSubmitError("僅支援 JPG、PNG 或 WebP 圖片。");
      return;
    }
    const oversizedFile = files.find((file) => file.size > 2 * 1024 * 1024);
    if (oversizedFile) {
      setSubmitError("每張圖片大小不可超過 2MB。");
      return;
    }

    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("圖片讀取失敗"));
            reader.readAsDataURL(file);
          })
      )
    )
      .then((newImages) => {
        setImagePreviews((previous) => {
          const next = [...previous, ...newImages];
          setForm((current) => ({
            ...current,
            imageUrl: next[0] || "",
            imageUrls: next,
          }));
          return next;
        });
        setSubmitError(null);
      })
      .catch(() => setSubmitError("圖片讀取失敗，請重試。"));
  };

  const removeImage = (index: number) => {
    setImagePreviews((previous) => {
      const next = previous.filter((_, itemIndex) => itemIndex !== index);
      setForm((current) => ({
        ...current,
        imageUrl: next[0] || "",
        imageUrls: next,
      }));
      return next;
    });
  };

  const updateField = (
    key: keyof typeof defaultForm,
    value: string | number
  ) => {
    setSubmitError(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFeature = (code: number) => {
    setSubmitError(null);
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(code)
        ? prev.features.filter((item) => item !== code)
        : [...prev.features, code],
    }));
  };

  const editor = useEditor({
    extensions: [StarterKit],
    content: form.notes,
    editable: !saving,
    onUpdate: ({ editor: currentEditor }) => {
      updateField("notes", currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!open || !editor) return;
    editor.commands.setContent(initialAsset?.notes || "", {
      emitUpdate: false,
    });
  }, [editor, initialAsset, open]);

  const handleSubmit = async () => {
    if (!form.address.trim()) {
      setSubmitError("請輸入地址。");
      return;
    }
    if (!form.roomType.trim()) {
      setSubmitError("請輸入房屋類型。");
      return;
    }
    if (isLeasedStatus && !form.tenantName.trim()) {
      setSubmitError("出租或欠繳狀態下請輸入承租人姓名。");
      return;
    }
    if (isLeasedStatus && !form.leaseEndDate) {
      setSubmitError("出租或欠繳狀態下請選擇租約到期日。");
      return;
    }

    const payload: PropertyAssetInput = {
      ...form,
      lat:
        typeof form.lat === "number" && Number.isFinite(form.lat)
          ? form.lat
          : null,
      lng:
        typeof form.lng === "number" && Number.isFinite(form.lng)
          ? form.lng
          : null,
      area: Number(form.area) || 0,
      monthlyRent: Number(form.monthlyRent) || 0,
      deposit: Number(form.deposit) || 0,
      managementFee: Number(form.managementFee) || 0,
      overdueDays: Number(form.overdueDays) || 0,
      overdueAmount: Number(form.overdueAmount) || 0,
      leaseEndDate: form.leaseEndDate,
    };

    setSaving(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setSubmitError(message || "儲存房屋物件失敗，請檢查欄位並重試。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-surface max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {isEdit ? "編輯房屋物件資訊" : "新增託管房屋物件"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            {isEdit
              ? "更新房屋實景、租金條件與最新租賃業務狀態。"
              : "建立新託管物件，專屬房號將由系統自動編碼產生。"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          {isEdit && initialAsset?.roomNumber && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 px-3.5 py-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">系統房號</span>
              <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                {initialAsset.roomNumber}
              </span>
            </div>
          )}

          {/* 圖片拖曳／點擊上傳區 */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="form-label">
                房屋實景照片
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                已上傳 {imagePreviews.length} / 10 張（JPG / PNG / WebP，單張 ≤ 2MB）
              </span>
            </div>

            <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:border-amber-500 hover:bg-amber-50/40 dark:border-slate-700 dark:bg-slate-900/50 p-4 text-center dark:hover:border-amber-500/60 dark:hover:bg-slate-900 transition cursor-pointer">
              <UploadCloud className="w-6 h-6 text-amber-500 dark:text-amber-400" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                點擊選取房屋實景照片（支援多選）
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleImageChange}
                disabled={saving}
              />
            </label>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 pt-1">
                {imagePreviews.map((image, index) => (
                  <div
                    key={`${index}-${image.slice(0, 30)}`}
                    className="group relative overflow-hidden rounded-lg border border-slate-300"
                  >
                    <img
                      src={image}
                      alt={`房屋圖片預覽 ${index + 1}`}
                      className="h-24 w-full object-cover"
                    />
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                        封面
                      </span>
                    )}
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-slate-300 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                      onClick={() => removeImage(index)}
                      disabled={saving}
                      aria-label="移除圖片"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <label className="form-label form-label-required">
              地址
            </label>
            <input
              required
              className={inputBaseClass}
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              placeholder="例如：台北市信義區松仁路 100 號 7 樓之 2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="form-label">縣市</label>
              <select
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                className={inputBaseClass}
              >
                <option value="">請選擇縣市</option>
                {TAIWAN_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="form-label">樓層</label>
              <input
                className={inputBaseClass}
                value={form.floor}
                onChange={(event) => updateField("floor", event.target.value)}
                placeholder="例如：7F"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="form-label form-label-required">
                房屋類型
              </label>
              <input
                required
                className={inputBaseClass}
                value={form.roomType}
                onChange={(event) => updateField("roomType", event.target.value)}
                placeholder="獨立套房、兩房一廳、電梯華廈"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="form-label form-label-required">
                目前業務現況
              </label>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value as PropertyStatus)
                }
                className={inputBaseClass}
              >
                <option value="rented">出租中</option>
                <option value="vacant">空置招租</option>
                <option value="overdue">租金欠繳／逾期待催繳</option>
                <option value="expiring">即將到期</option>
                <option value="maintenance">裝修維護</option>
              </select>
            </div>
          </div>

          {open && (
            <LocationPickerMap
              key={initialAsset?.id || "new-asset-location-picker"}
              city={form.city}
              address={form.address}
              lat={form.lat}
              lng={form.lng}
              disabled={saving}
              onChange={({ lat, lng }) => {
                setSubmitError(null);
                setForm((prev) => ({ ...prev, lat, lng }));
              }}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span
                className={`form-label ${isLeasedStatus ? "form-label-required" : ""}`}
              >
                承租人姓名
              </span>
              <input
                className={inputBaseClass}
                value={form.tenantName}
                onChange={(event) =>
                  updateField("tenantName", event.target.value)
                }
                placeholder={isLeasedStatus ? "請輸入承租人姓名" : "空置可免填"}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="form-label">
                聯絡電話
              </span>
              <input
                className={inputBaseClass}
                value={form.tenantPhone}
                onChange={(event) =>
                  updateField("tenantPhone", event.target.value)
                }
                placeholder="例如：0912-345-678"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-1.5">
              <span className="form-label">
                坪數 (坪)
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                className={inputBaseClass}
                value={form.area}
                onChange={(event) =>
                  updateField("area", Number(event.target.value))
                }
              />
            </label>
            <label className="grid gap-1.5">
              <span className="form-label form-label-required">
                月租金 (NT$)
              </span>
              <input
                required
                type="number"
                min="0"
                className={inputBaseClass}
                value={form.monthlyRent}
                onChange={(event) =>
                  updateField("monthlyRent", Number(event.target.value))
                }
              />
            </label>
            <label className="grid gap-1.5">
              <span className="form-label">
                押金 (NT$)
              </span>
              <input
                type="number"
                min="0"
                className={inputBaseClass}
                value={form.deposit}
                onChange={(event) =>
                  updateField("deposit", Number(event.target.value))
                }
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5">
              <span className="form-label">
                管理費 (NT$/月)
              </span>
              <input
                type="number"
                min="0"
                className={inputBaseClass}
                value={form.managementFee}
                onChange={(event) =>
                  updateField("managementFee", Number(event.target.value))
                }
              />
            </label>
            <label className="grid gap-1.5">
              <span
                className={`form-label ${isLeasedStatus ? "form-label-required" : ""}`}
              >
                租約到期日
              </span>
              <input
                type="date"
                className={inputBaseClass}
                value={form.leaseEndDate}
                onChange={(event) =>
                  updateField("leaseEndDate", event.target.value)
                }
              />
            </label>
          </div>
          <div className="grid gap-2">
            <span className="form-label">
              物件特色標籤
            </span>
            <div className="flex flex-wrap gap-2.5">
              {PROPERTY_FEATURES.map((feature) => {
                const checkboxId = `property-feature-${feature.code}`;
                const isChecked = form.features.includes(feature.code);
                return (
                  <label
                    key={feature.code}
                    htmlFor={checkboxId}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition cursor-pointer select-none ${isChecked
                      ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-300"
                      : "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600"
                      }`}
                  >
                    <input
                      type="checkbox"
                      id={checkboxId}
                      name="features"
                      value={feature.code}
                      checked={isChecked}
                      onChange={() => toggleFeature(feature.code)}
                      disabled={saving}
                      className="h-3.5 w-3.5 accent-amber-500 cursor-pointer"
                    />
                    <span>{feature.value}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {(form.status === "overdue" ||
            form.overdueDays > 0 ||
            form.overdueAmount > 0) && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-rose-300">
                    逾期天數 (天)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={inputBaseClass}
                    value={form.overdueDays}
                    onChange={(event) =>
                      updateField("overdueDays", Number(event.target.value))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold text-rose-300">
                    逾期待催繳金額 (NT$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={inputBaseClass}
                    value={form.overdueAmount}
                    onChange={(event) =>
                      updateField("overdueAmount", Number(event.target.value))
                    }
                  />
                </div>
              </div>
            )}

          {form.status === "maintenance" && (
            <div className="grid gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/5 p-3">
              <label className="text-xs font-semibold text-purple-300">
                裝修維護原因／派工項目
              </label>
              <input
                className={inputBaseClass}
                value={form.maintenanceReason}
                onChange={(event) =>
                  updateField("maintenanceReason", event.target.value)
                }
                placeholder="例如：冷氣管線清洗與浴室防水重新施作"
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <label className="form-label">
              房間設備與備註介紹
            </label>
            <div className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-700/80 dark:bg-slate-900/70">
              <MenuBar editor={editor} saving={saving} />
              <EditorContent
                editor={editor}
                className="min-h-24 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 [&_.tiptap]:min-h-20 [&_.tiptap]:outline-none [&_.tiptap_p]:my-1 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5"
              />
            </div>
          </div>
        </div>

        {submitError && (
          <p role="alert" className="error-message">
            {submitError}
          </p>
        )}

        <DialogFooter className="gap-2 pt-2">
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
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "儲存中..." : isEdit ? "儲存變更" : "建立房屋物件"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditDialog;
