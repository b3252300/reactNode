import Card from "@/components/box/Card";
import ButtonTag from "@/components/button/Button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusIcon,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Send,
  Pencil,
} from "lucide-react";
import { EventListCard, EventListCardOpaz } from "@/components/icon/index";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import useDate from "@/utils/date";
import { getPropertyFeatureLabel } from "@/constants/propertyFeatures";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPropertyAssetApi,
  deletePropertyAssetApi,
  getPropertyAssetsApi,
  updatePropertyAssetApi,
} from "@/api/propertyStatusAssets";
import type {
  PropertyAsset,
  PropertyAssetInput,
  PropertyStatusFilter,
} from "@/types/propertyStatusAssets";
import DrawerContent from "@/components/drawer/DrawerContent";
import EventListViewCardOpaz from "./EventListViewCardOpaz";
import EventListViewCardCol from "./EventListViewCardCol";
import TagList from "./TagList";
import EditDialog from "./EditDialog";

const { GetDateYYYYMMDD } = useDate();

function NotesPreview({ content }: { content: string }) {
  const editor = useEditor(
    {
      extensions: [StarterKit],
      content,
      editable: false,
    },
    [content]
  );

  return (
    <EditorContent
      editor={editor}
      className="users-detail__value [&_.tiptap_p]:my-1 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5"
    />
  );
}

function List() {
  const navigate = useNavigate();
  const [data, setData] = useState<PropertyAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PropertyAsset | null>(null);
  const [statusFilter, setStatusFilter] = useState<PropertyStatusFilter>("all");
  const [searchInput, setSearchInput] = useState<string>("");
  const [eventList, setEventList] = useState<boolean>(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PropertyAsset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<PropertyAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const assets = await getPropertyAssetsApi();
      setData(assets);
      window.dispatchEvent(new CustomEvent("property-assets-updated"));
    } catch (err) {
      console.error("取得房屋物件失敗：", err);
      setError("無法載入房屋物件資料，請稍後再試。");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssets();
  }, []);

  const filteredData = useMemo(() => {
    if (statusFilter === "all") {
      return data;
    }
    return data.filter((item) => item.status === statusFilter);
  }, [data, statusFilter]);

  const searchTerm = searchInput.trim().toLowerCase();
  const filteredDataBySearch = useMemo(() => {
    if (!searchTerm) {
      return filteredData;
    }

    return filteredData.filter((item) => {
      const haystack = [
        item.roomNumber,
        item.city,
        item.address,
        item.tenantName,
        item.roomType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchTerm);
    });
  }, [filteredData, searchTerm]);

  const statusCounts = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [data]);

  function stausColor(status: string) {
    if (status === "overdue") return "status-badge";
    if (status === "rented") return "status-rented";
    if (status === "expiring") return "status-expiring";
    if (status === "maintenance") return "status-maintenance";
    if (status === "vacant") return "status-vacant";
    return "";
  }

  function handleCardClick(item: PropertyAsset) {
    setSelectedItem(item);
  }

  async function handleSubmitAsset(payload: PropertyAssetInput) {
    if (editingAsset) {
      const updated = await updatePropertyAssetApi(editingAsset.id, payload);
      if (selectedItem?.id === editingAsset.id) {
        setSelectedItem(updated);
      }
      showToast(`已成功更新房號 ${updated.roomNumber} 資訊`);
    } else {
      const created = await createPropertyAssetApi(payload);
      showToast(`已成功建立新物件（房號：${created.roomNumber}）`);
    }
    setAddOpen(false);
    setEditingAsset(null);
    await loadAssets();
  }

  function handleRequestDelete(item: PropertyAsset) {
    setDeletingAsset(item);
  }

  async function confirmDeleteAsset() {
    if (!deletingAsset) return;
    setDeleting(true);
    try {
      await deletePropertyAssetApi(deletingAsset.id);
      if (selectedItem?.id === deletingAsset.id) {
        setSelectedItem(null);
      }
      showToast(`已刪除房號 ${deletingAsset.roomNumber}`);
      setDeletingAsset(null);
      await loadAssets();
    } catch (err) {
      console.error("刪除房屋物件失敗：", err);
      setError("刪除失敗，請稍後再試。");
    } finally {
      setDeleting(false);
    }
  }

  function handleEditAsset(item: PropertyAsset) {
    setEditingAsset(item);
    setAddOpen(true);
  }

  function handleAddAsset() {
    setEditingAsset(null);
    setAddOpen(true);
  }

  const selectedImages = selectedItem
    ? selectedItem.imageUrls?.length
      ? selectedItem.imageUrls
      : selectedItem.imageUrl
        ? [selectedItem.imageUrl]
        : []
    : [];

  return (
    <div className="space-y-4">
      {/* 浮動通知 Toast */}
      {toastMessage && (
        <div
          role="status"
          className="toast-success"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <TagList
        selectStatus={setStatusFilter}
        activeStatus={statusFilter}
        data={data}
        handleSearch={setSearchInput}
        statusCounts={statusCounts}
        searchInput={searchInput}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            className="btn-primary font-semibold px-4 h-9 cursor-pointer"
            onClick={handleAddAsset}
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            新增房屋物件
          </Button>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            目前顯示 <strong className="text-slate-800 dark:text-slate-200">{filteredDataBySearch.length}</strong> 筆物件
          </span>
        </div>

        <EditDialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) setEditingAsset(null);
          }}
          isEdit={Boolean(editingAsset)}
          initialAsset={editingAsset}
          onSubmit={handleSubmitAsset}
        />

        <div className="filter-container items-center bg-white border border-slate-200 dark:bg-[#0B1120] dark:border-slate-800 rounded-lg p-1 gap-1">
          <button
            type="button"
            title="卡片網格檢視"
            aria-label="卡片網格檢視"
            onClick={() => setEventList(true)}
            className={`tab-btn-soft p-1.5 ${eventList ? "tab-btn-soft-active" : ""}`}
          >
            <EventListCardOpaz className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="列表橫排檢視"
            aria-label="列表橫排檢視"
            onClick={() => setEventList(false)}
            className={`tab-btn-soft p-1.5 ${!eventList ? "tab-btn-soft-active" : ""}`}
          >
            <EventListCard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 載入中 Skeleton 骨架屏 */}
      {loading && (
        <div className="property-grid">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Card key={idx} className="p-4 flex-col gap-3">
              <Skeleton className="h-36 w-full rounded-xl bg-slate-800/70" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-28 bg-slate-800/70" />
                <Skeleton className="h-5 w-16 rounded-full bg-slate-800/70" />
              </div>
              <Skeleton className="h-3 w-40 bg-slate-800/60" />
              <div className="flex justify-between pt-2 border-t border-slate-800/60">
                <Skeleton className="h-8 w-20 bg-slate-800/60" />
                <Skeleton className="h-8 w-24 bg-slate-800/60" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && error && <div className="error-message">{error}</div>}

      {!loading && !error && filteredDataBySearch.length === 0 && (
        <Card className="p-12 flex-col items-center justify-center text-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="text-base font-semibold text-slate-200">
            目前沒有符合條件的房屋物件
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            您可以嘗試切換上方的房態篩選標籤、清除搜尋關鍵字，或直接點擊「新增房屋物件」建立第一筆託管資產。
          </p>
          {(statusFilter !== "all" || searchInput) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setSearchInput("");
              }}
            >
              重設所有篩選條件
            </Button>
          )}
        </Card>
      )}

      {!loading && !error && filteredDataBySearch.length > 0 && eventList && (
        <EventListViewCardOpaz
          filteredDataBySearch={filteredDataBySearch}
          handleCardClick={handleCardClick}
          stausColor={stausColor}
          onEdit={handleEditAsset}
          onDelete={handleRequestDelete}
        />
      )}

      {!loading && !error && filteredDataBySearch.length > 0 && !eventList && (
        <EventListViewCardCol
          filteredDataBySearch={filteredDataBySearch}
          handleCardClick={handleCardClick}
          stausColor={stausColor}
          selectedItem={selectedItem}
          onEdit={handleEditAsset}
          onDelete={handleRequestDelete}
        />
      )}

      {/* 右側物件詳情抽屜 */}
      {selectedItem && (
        <DrawerContent
          onClose={() => setSelectedItem(null)}
          childrenHeader={
            <div className="space-y-1">
              <div className="card-room-group">
                <div className="card-header items-center gap-2.5">
                  <h1 className="text-xl font-bold font-mono">
                    {selectedItem.roomNumber}
                  </h1>
                  {selectedItem.floor && (
                    <span className="floor-badge text-xs">
                      {selectedItem.floor} F
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm">
                {selectedItem.roomType}
                {selectedItem.area ? ` • ${selectedItem.area} 坪` : null}
                {selectedItem.address ? ` • ${selectedItem.address}` : null}
              </div>
            </div>
          }
        >
          {selectedImages.length > 0 && (
            <Card className="w-full p-3">
              <Carousel className="w-full">
                <CarouselContent>
                  {selectedImages.map((imageUrl, index) => (
                    <CarouselItem
                      className="basis-1/3 sm:basis-1/4"
                      key={`${index}-${imageUrl.slice(0, 30)}`}
                    >
                      <button
                        type="button"
                        className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-slate-800"
                        aria-label={`放大檢視圖片 ${index + 1}`}
                        onClick={() => {
                          setLightboxStartIndex(index);
                          setLightboxOpen(true);
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt={`${selectedItem.address || selectedItem.roomNumber} 圖片 ${index + 1}`}
                          className="h-24 w-full object-cover hover:scale-105 transition-transform"
                        />
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="carousel-pre" />
                <CarouselNext className="carousel-next" />
              </Carousel>
            </Card>
          )}

          <Card className="w-full flex items-center justify-between p-4">
            <span className="text-sm font-medium">
              目前業務現況
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`status-badge card-tag ${stausColor(selectedItem.status)}`}
              >
                <span className="status-dot"></span>
                {selectedItem.statusText}
              </span>
              <Button
                variant="default"
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => handleEditAsset(selectedItem)}
              >
                <Pencil className="w-3 h-3 mr-1" />
                編輯
              </Button>
            </div>
          </Card>

          <Card className="flex-col w-full">
            <div className="gap-2.5 flex flex-col p-5 text-sm">
              <div className="users-detail">
                <span className="users-detail__title">承租房客</span>
                <span className="users-detail__value font-semibold">
                  {selectedItem.tenantName || "待招租 / 尚無房客"}
                </span>
              </div>
              <div className="users-detail">
                <span className="users-detail__title">聯絡電話</span>
                <span className="users-detail__value font-mono">
                  {selectedItem.tenantPhone || "—"}
                </span>
              </div>
              <div className="users-detail">
                <span className="users-detail__title">地址</span>
                <span className="users-detail__value">
                  {selectedItem.address || "—"}
                </span>
              </div>
              <div className="users-detail">
                <span className="users-detail__title">月租金</span>
                <span className="users-detail__value font-mono font-bold text-amber-400">
                  NT$ {Number(selectedItem.monthlyRent || 0).toLocaleString("zh-TW")}
                </span>
              </div>
              <div className="users-detail">
                <span className="users-detail__title">押金／管理費</span>
                <span className="users-detail__value font-mono">
                  押金 NT$ {Number(selectedItem.deposit || 0).toLocaleString("zh-TW")} ／ 管理費 NT$ {Number(selectedItem.managementFee || 0).toLocaleString("zh-TW")}
                </span>
              </div>
              <div className="users-detail">
                <span className="users-detail__title">租約到期日</span>
                <span className="users-detail__value font-mono">
                  {GetDateYYYYMMDD(selectedItem.leaseEndDate)}
                </span>
              </div>
              <div className="users-detail">
                <span className="users-detail__title">逾期天數</span>
                <span className="users-detail__value">
                  {selectedItem.overdueDays
                    ? `${selectedItem.overdueDays} 天`
                    : "正常無逾期"}
                </span>
              </div>
              {selectedItem.maintenanceReason && (
                <div className="users-detail">
                  <span className="users-detail__title">維修原因</span>
                  <span className="users-detail__value text-purple-300">
                    {selectedItem.maintenanceReason}
                  </span>
                </div>
              )}
              {selectedItem.features && selectedItem.features.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="users-detail__title block mb-2">
                    物件特色標籤
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.features.map((code) => (
                      <span
                        key={code}
                        className="badge-emerald"
                      >
                        {getPropertyFeatureLabel(code)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="users-detail__title block mb-1">
                  房間設備與介紹
                </span>
                {selectedItem.notes ? (
                  <NotesPreview content={selectedItem.notes} />
                ) : (
                  <span className="users-detail__value text-slate-500">
                    尚未填寫房間介紹備註
                  </span>
                )}
              </div>
            </div>
          </Card>

          {(selectedItem.overdueAmount ?? 0) > 0 && (
            <Card className="w-full flex-col status-overdue status-badge p-4">
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="text-xs font-medium text-rose-300">
                    累計逾期待催繳金額
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-0.5">
                    NT$ {Number(selectedItem.overdueAmount).toLocaleString("zh-TW")}
                  </div>
                </div>
                <AlertTriangle className="w-7 h-7 text-rose-400/80" />
              </div>
            </Card>
          )}

          <div className="flex flex-col gap-2.5 w-full pt-1">
            {(selectedItem.overdueAmount ?? 0) > 0 && (
              <ButtonTag
                className="w-full justify-center"
                size="lg"
                onClick={() =>
                  showToast(
                    `已向 ${selectedItem.tenantName || selectedItem.roomNumber} 發送急件催繳簡訊與帳單通知`
                  )
                }
              >
                <Send className="w-4 h-4" />
                發送急件催繳通知
              </ButtonTag>
            )}
            <ButtonTag
              className="w-full justify-center"
              size="lg"
              onClick={() => {
                const params = new URLSearchParams({
                  room: selectedItem.roomNumber,
                  address: selectedItem.address || "",
                  tenant: selectedItem.tenantName || "",
                });
                navigate(`/butler-repair-request?${params.toString()}`);
              }}
            >
              <Wrench className="w-4 h-4" />
              指派管家勘查或點交
            </ButtonTag>
          </div>
        </DrawerContent>
      )}

      {/* 刪除確認彈窗（取代瀏覽器原生 window.confirm） */}
      <Dialog
        open={Boolean(deletingAsset)}
        onOpenChange={(open) => {
          if (!open) setDeletingAsset(null);
        }}
      >
        <DialogContent className="dialog-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              確認刪除房屋物件
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300 pt-1">
              您確定要刪除房號{" "}
              <strong className="font-mono text-amber-400">
                {deletingAsset?.roomNumber}
              </strong>
              （{deletingAsset?.address || deletingAsset?.roomType}）嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeletingAsset(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDeleteAsset}
              disabled={deleting}
            >
              {deleting ? "刪除中..." : "確認永久刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 圖片放大檢視 Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="h-[90vh] w-[95vw] max-w-none border-0 bg-black/95 p-4 text-white sm:max-w-none">
          <DialogTitle className="sr-only">
            {selectedItem?.roomNumber} 房屋圖片
          </DialogTitle>
          {selectedImages.length > 0 && (
            <Carousel
              className="flex h-full w-full items-center"
              opts={{ startIndex: lightboxStartIndex }}
            >
              <CarouselContent className="h-full items-center">
                {selectedImages.map((imageUrl, index) => (
                  <CarouselItem key={`${index}-${imageUrl.slice(0, 30)}`}>
                    <img
                      src={imageUrl}
                      alt={`${selectedItem?.address || selectedItem?.roomNumber} 圖片 ${index + 1}`}
                      className="h-[82vh] w-full rounded-md object-contain"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="carousel-pre" />
              <CarouselNext className="carousel-next" />
            </Carousel>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default List;
