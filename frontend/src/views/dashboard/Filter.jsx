import { Link } from 'react-router-dom';
import {
  ArrowUpDown,
  Home as HomeIcon,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  buildFilterQueryString,
  CITY_OPTIONS,
  INITIAL_FILTERS,
  LAYOUT_OPTIONS,
  MANAGEMENT_FEE_OPTIONS,
  RENT_RANGE_OPTIONS,
  ROOM_TYPE_OPTIONS,
  SORT_OPTIONS,
} from './filterQueryParams';

export {
  CITY_OPTIONS,
  INITIAL_FILTERS,
  LAYOUT_OPTIONS,
  MANAGEMENT_FEE_OPTIONS,
  RENT_RANGE_OPTIONS,
  ROOM_TYPE_OPTIONS,
  SORT_OPTIONS,
};

function Filter({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  loading,
  totalCount,
}) {
  return (
    <section className="panel-surface backdrop-blur p-5 sm:p-6 shadow-lg shadow-slate-900/5 dark:shadow-xl dark:shadow-black/30 space-y-5">
      {/* 第一列：地點 / 關鍵字搜尋 */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={filters.keyword}
          onChange={(event) => onFilterChange('keyword', event.target.value)}
          placeholder="搜尋地點、路段、行政區、房號或特色（例如：信義區、近捷運、獨立陽台）..."
          className="form-input h-12 rounded-xl dark:bg-slate-950/80 pl-12 pr-11"
        />
        {filters.keyword && (
          <button
            type="button"
            onClick={() => onFilterChange('keyword', '')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition cursor-pointer"
            aria-label="清除搜尋關鍵字"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 第二列：房屋類型快捷標籤 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
          <HomeIcon className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          房屋類型
        </span>
        {ROOM_TYPE_OPTIONS.map((typeOption) => {
          const isActive = filters.roomType === typeOption;
          return (
            <button
              key={typeOption}
              type="button"
              onClick={() => onFilterChange('roomType', typeOption)}
              className={`tab-btn px-3.5 sm:text-sm ${isActive
                ? 'tab-btn-active'
                : 'border border-slate-200 bg-slate-50 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700 dark:hover:text-slate-100'
                }`}
            >
              {typeOption}
            </button>
          );
        })}
      </div>

      {/* 第三列：縣市、租金區間、管理費、格局、排序 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-slate-400 mb-1.5">
            <MapPin className="h-3 w-3 text-amber-400" />
            縣市
          </label>
          <select
            value={filters.city}
            onChange={(event) => onFilterChange('city', event.target.value)}
            className="form-select w-full rounded-xl"
          >
            {CITY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-white dark:bg-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            租金預算
          </label>
          <select
            value={filters.rentRangeId}
            onChange={(event) => onFilterChange('rentRangeId', event.target.value)}
            className="form-select w-full rounded-xl"
          >
            {RENT_RANGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-white dark:bg-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            是否含管理費
          </label>
          <select
            value={filters.managementFeeType}
            onChange={(event) => onFilterChange('managementFeeType', event.target.value)}
            className="form-select w-full rounded-xl"
          >
            {MANAGEMENT_FEE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-white dark:bg-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            格局條件
          </label>
          <select
            value={filters.layout}
            onChange={(event) => onFilterChange('layout', event.target.value)}
            className="form-select w-full rounded-xl"
          >
            {LAYOUT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-white dark:bg-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-slate-400 mb-1.5">
            <ArrowUpDown className="h-3 w-3 text-amber-400" />
            排序方式
          </label>
          <select
            value={filters.sort}
            onChange={(event) => onFilterChange('sort', event.target.value)}
            className="form-select w-full rounded-xl"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} className="bg-white dark:bg-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 結果統計與重設按鈕 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <SlidersHorizontal className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          {loading ? (
            <span>正在搜尋空置招租物件...</span>
          ) : (
            <span>
              共找到{' '}
              <strong className="font-bold text-amber-600 dark:text-amber-400">{totalCount}</strong>{' '}
              間空置招租物件
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="btn-secondary"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重設篩選條件
            </button>
          )}

          <Link
            to={`/map${buildFilterQueryString(filters)}`}
            className="btn-outline-amber px-3.5"
          >
            <MapIcon className="h-3.5 w-3.5" />
            切換地圖找房
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Filter;
