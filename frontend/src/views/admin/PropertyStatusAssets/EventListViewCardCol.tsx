import type { PropertyAsset } from "@/types/propertyStatusAssets";
import Card from "@/components/box/Card";
import ArrowRight from "@/components/icon/ArrowRight";
import { Building2 } from "lucide-react";
import { DropdownMenuDestructive } from "./DropdownMenuDestructive";
import useDate from "@/utils/date";

const { GetDateYYYYMMDD } = useDate();

interface EventListViewCardColProps {
  filteredDataBySearch: PropertyAsset[];
  handleCardClick: (item: PropertyAsset) => void;
  stausColor: (status: string) => string;
  selectedItem: PropertyAsset | null;
  onEdit: (item: PropertyAsset) => void;
  onDelete: (item: PropertyAsset) => void;
}

function EventListViewCardCol({
  filteredDataBySearch,
  handleCardClick,
  stausColor,
  selectedItem,
  onEdit,
  onDelete,
}: EventListViewCardColProps) {
  return (
    <div className="column-grid">
      {filteredDataBySearch.map((item) => {
        const coverImage = item.imageUrls?.[0] || item.imageUrl;

        return (
          <Card
            key={item.id || item.roomNumber}
            isGap={"gap-4"}
            className={`column-card cursor-pointer p-4 transition hover:border-slate-700 ${selectedItem?.roomNumber === item.roomNumber ? "isActived" : ""
              }`}
            style={{ alignItems: "center" }}
            onClick={() => handleCardClick(item)}
          >
            <div>
              <DropdownMenuDestructive
                asset={item}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>

            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-center">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={item.address || item.roomNumber}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-slate-700" />
              )}
            </div>

            <div className="card-header-column">
              <div className="card-room-group">
                <span className="room-id font-bold">{item.roomNumber}</span>
                {item.floor && (
                  <span className="floor-badge">{item.floor} F</span>
                )}
              </div>
              <span
                className={`status-badge card-tag ${stausColor(item.status)}`}
              >
                <span className="status-dot"></span>
                {item.statusText}
              </span>
            </div>

            <div className="card-body-column">
              <div className="rent-group">
                <div className="info-label">承租人</div>
                <div className="tenant-name">
                  {item.tenantName || (
                    <span className="text-slate-500 font-normal">待招租</span>
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

            <div className="card-desc-column text-sm">
              <div>
                {item.roomType} {item.area ? `• ${item.area} 坪` : null}
              </div>
              {item.address && (
                <div className="text-sm  mt-0.5">
                  {item.address}
                </div>
              )}
            </div>

            <div className="card-footer-column text-xs">
              <span>租約到期: {GetDateYYYYMMDD(item.leaseEndDate)}</span>
              <ArrowRight />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default EventListViewCardCol;
