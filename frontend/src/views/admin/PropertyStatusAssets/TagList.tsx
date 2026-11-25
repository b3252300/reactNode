import Card from "@/components/box/Card";
import Button from "@/components/button/Button";
import { Search } from "@/components/icon/index";
import { X } from "lucide-react";
import type { PropertyAsset, PropertyStatusFilter } from "@/types/propertyStatusAssets";

interface TagListProps {
  selectStatus: (status: PropertyStatusFilter) => void;
  activeStatus: PropertyStatusFilter;
  data: PropertyAsset[];
  handleSearch: (value: string) => void;
  statusCounts: Record<string, number>;
  searchInput: string;
}

function TagList({
  selectStatus,
  activeStatus,
  data,
  handleSearch,
  statusCounts,
  searchInput,
}: TagListProps) {
  const getTabClass = (status: PropertyStatusFilter) =>
    activeStatus === status
      ? "tab-btn-soft-active shadow-sm"
      : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/60 dark:hover:text-slate-200";

  return (
    <Card className="p-3 items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => selectStatus("all")}
          className={getTabClass("all") + " text-sm dark:text-white"}
        >
          全部 ({data.length ?? 0})
        </Button>
        <Button
          onClick={() => selectStatus("rented")}
          variants="outline"

          className={getTabClass("rented") + " text-sm dark:text-white"}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          出租中 ({statusCounts.rented ?? 0})
        </Button>
        <Button
          onClick={() => selectStatus("expiring")}
          className={getTabClass("expiring") + " text-sm dark:text-white"}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          即將到期 ({statusCounts.expiring ?? 0})
        </Button>
        <Button
          onClick={() => selectStatus("overdue")}
          className={getTabClass("overdue") + " text-sm dark:text-white"}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          逾期待催繳 ({statusCounts.overdue ?? 0})
        </Button>
        <Button
          onClick={() => selectStatus("maintenance")}
          className={getTabClass("maintenance") + " text-sm dark:text-white"}
        >
          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          裝修維護 ({statusCounts.maintenance ?? 0})
        </Button>
        <Button
          onClick={() => selectStatus("vacant")}
          className={getTabClass("vacant") + " text-sm dark:text-white"}
        >
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          空置招租 ({statusCounts.vacant ?? 0})
        </Button>
      </div>

      <div className="relative w-full sm:w-64">
        <Search />
        <input
          type="text"
          placeholder="搜尋房號、地址、房客、房型..."
          className="form-input h-9 pl-8 pr-7 text-xs dark:border-slate-800 dark:text-slate-200"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => handleSearch("")}
            aria-label="清除搜尋"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </Card>
  );
}
export default TagList;
