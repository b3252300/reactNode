import { Card } from "@/components/icon";
import ArrowRight from "@/components/icon/ArrowRight";
import { Building2, MapPin } from "lucide-react";
import type { PropertyAsset } from "@/types/propertyStatusAssets";
import { DropdownMenuDestructive } from "./DropdownMenuDestructive";
import useDate from "@/utils/date";

const { GetDateYYYYMMDD } = useDate();

interface EventListViewCardOpazProps {
  filteredDataBySearch: PropertyAsset[];
  handleCardClick: (item: PropertyAsset) => void;
  stausColor: (status: string) => string;
  onEdit: (item: PropertyAsset) => void;
  onDelete: (item: PropertyAsset) => void;
}

function EventListViewCardOpaz({
  filteredDataBySearch,
  handleCardClick,
  stausColor,
  onEdit,
  onDelete,
}: EventListViewCardOpazProps) {
  return (
    <div className="property-grid">
      {filteredDataBySearch.map((item) => {
        const coverImage = item.imageUrls?.[0] || item.imageUrl;

        return (
          <Card
            isGap={"gap-2.5"}
            key={item.id || item.roomNumber}
            className="property-card cursor-pointer justify-between"
            onClick={() => handleCardClick(item)}
          >
            <div className="relative h-36 w-full overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-900">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={item.address || item.roomNumber}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-600">
                  <Building2 className="h-8 w-8 text-slate-700" />
                  <span className="text-[11px] font-medium text-slate-500">
                    尚未上傳物件實景
                  </span>
                </div>
              )}
              {item.floor && (
                <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium text-slate-200 backdrop-blur-sm border border-slate-800">
                  {item.floor}
                </span>
              )}
              {item.imageUrls && item.imageUrls.length > 1 && (
                <span className="absolute bottom-2 right-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium text-amber-400 backdrop-blur-sm border border-slate-800">
                  {item.imageUrls.length} 張照片
                </span>
              )}
            </div>

            <div className="card-header pt-1">
              <div className="grid gap-1.5">
                <div className="card-body card-room-group">
                  <span className="room-id font-bold text-sm tracking-wide">
                    <span className="info-label pe-2 font-sans font-normal">
                      編號
                    </span>
                    {item.roomNumber}
                  </span>
                </div>
                <span
                  className={`status-badge card-tag ${stausColor(item.status)}`}
                >
                  <span className="status-dot"></span>
                  {item.statusText}
                </span>
              </div>
              <div
                className="ml-auto"
                style={{ marginTop: "-0.5rem", marginRight: "-0.6rem" }}
              >
                <DropdownMenuDestructive
                  asset={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="card-desc !my-0 text-sm font-medium">
                {item.roomType}
                {item.area ? ` • ${item.area} 坪` : null}
              </div>
              {item.address && (
                <div className="flex items-center gap-1 text-xs  truncate">
                  <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
                  <span className="truncate">{item.address}</span>
                </div>
              )}
            </div>

            <hr className="my-1" />

            <div className="card-body">
              <div>
                <div className="info-label">承租人</div>
                <div className="tenant-name text-sm">
                  {item.tenantName || (
                    <span>待招租</span>
                  )}
                </div>
              </div>
              <div className="rent-group">
                <div className="info-label">月租金</div>
                <div className="rent-amount">
                  NT$ {Number(item.monthlyRent || 0).toLocaleString("zh-TW")}
                </div>
              </div>
            </div>

            <div className="card-footer !mt-1 text-xs border-t border-slate-800/60 pt-2.5">
              <span>租約到期: {GetDateYYYYMMDD(item.leaseEndDate)}</span>
              <ArrowRight />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default EventListViewCardOpaz;
