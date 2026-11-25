import { Link } from 'react-router-dom';
import {
  LayoutGrid,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  CITY_OPTIONS,
  LAYOUT_OPTIONS,
  MANAGEMENT_FEE_OPTIONS,
  RENT_RANGE_OPTIONS,
  ROOM_TYPE_OPTIONS,
  SORT_OPTIONS,
} from '../Filter';
import { buildFilterQueryString } from '../filterQueryParams';

const selectClass = 'form-select h-9 dark:bg-slate-950/90 px-2.5 text-xs';

function MapFilterBar({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  hasBoundsFilter,
}) {
  const listViewHref = `/${buildFilterQueryString(filters)}`;

  return (
    <section className="shrink-0 z-20 border-b border-slate-200 bg-white/95 dark:border-slate-800/90 dark:bg-[#0B1120]/95 backdrop-blur px-3 sm:px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* 關鍵字搜尋 */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filters.keyword}
            onChange={(event) => onFilterChange('keyword', event.target.value)}
            placeholder="搜尋地點、路段、房號或特色..."
            className="form-input h-9 dark:bg-slate-950/90 pl-9 pr-8 text-xs"
          />
          {filters.keyword && (
            <button
              type="button"
              onClick={() => onFilterChange('keyword', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition cursor-pointer"
              aria-label="清除關鍵字"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* 縣市 */}
        <select
          aria-label="選擇縣市"
          value={filters.city}
          onChange={(event) => onFilterChange('city', event.target.value)}
          className={selectClass}
        >
          {CITY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id} className="bg-white dark:bg-slate-900">
              {option.label}
            </option>
          ))}
        </select>

        {/* 房屋類型 */}
        <select
          aria-label="選擇房屋類型"
          value={filters.roomType}
          onChange={(event) => onFilterChange('roomType', event.target.value)}
          className={selectClass}
        >
          {ROOM_TYPE_OPTIONS.map((typeOption) => (
            <option key={typeOption} value={typeOption} className="bg-white dark:bg-slate-900">
              {typeOption === '全部' ? '房型不限' : typeOption}
            </option>
          ))}
        </select>

        {/* 租金區間 */}
        <select
          aria-label="選擇租金預算"
          value={filters.rentRangeId}
          onChange={(event) => onFilterChange('rentRangeId', event.target.value)}
          className={selectClass}
        >
          {RENT_RANGE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id} className="bg-white dark:bg-slate-900">
              {option.label}
            </option>
          ))}
        </select>

        {/* 管理費 */}
        <select
          aria-label="選擇管理費條件"
          value={filters.managementFeeType}
          onChange={(event) => onFilterChange('managementFeeType', event.target.value)}
          className={`${selectClass} hidden md:inline-block`}
        >
          {MANAGEMENT_FEE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id} className="bg-white dark:bg-slate-900">
              {option.label}
            </option>
          ))}
        </select>

        {/* 格局 */}
        <select
          aria-label="選擇格局條件"
          value={filters.layout}
          onChange={(event) => onFilterChange('layout', event.target.value)}
          className={`${selectClass} hidden xl:inline-block`}
        >
          {LAYOUT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id} className="bg-white dark:bg-slate-900">
              {option.label}
            </option>
          ))}
        </select>

        {/* 排序 */}
        <select
          aria-label="選擇排序方式"
          value={filters.sort}
          onChange={(event) => onFilterChange('sort', event.target.value)}
          className={`${selectClass} hidden sm:inline-block`}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id} className="bg-white dark:bg-slate-900">
              {option.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          {(hasActiveFilters || hasBoundsFilter) && (
            <button
              type="button"
              onClick={onReset}
              className="btn-secondary h-9 text-slate-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>重設</span>
            </button>
          )}

          <Link
            to={listViewHref}
            className="btn-outline-amber h-9"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>列表檢視</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default MapFilterBar;
