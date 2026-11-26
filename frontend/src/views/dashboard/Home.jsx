import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Building2,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { getPublicVacantAssetsApi } from '../../api/home';
import { useAuth } from '../auth/AuthContext';
import Header from './Header';
import Footer from './Footer';
import Card, { PropertyCardSkeleton } from './Card';
import CardDetailModal from './CardDetailModal';
import FilterContent, { INITIAL_FILTERS, RENT_RANGE_OPTIONS } from './Filter';
import {
  buildSearchParamsFromFilters,
  parseFiltersFromSearchParams,
} from './filterQueryParams';

export default function Home() {
  const { user, status: authStatus } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 篩選條件狀態（支援 URL query 同步）
  const [filters, setFilters] = useState(() => parseFiltersFromSearchParams(searchParams));
  const [debouncedKeyword, setDebouncedKeyword] = useState(() => (searchParams.get('q') || '').trim());

  const [selectedAsset, setSelectedAsset] = useState(null);

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 關鍵字輸入防抖，避免每次按鍵都發送 API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(filters.keyword.trim());
    }, 280);
    return () => clearTimeout(timer);
  }, [filters.keyword]);

  // 同步篩選條件至 URL query string
  useEffect(() => {
    const nextParams = buildSearchParamsFromFilters({
      ...filters,
      keyword: debouncedKeyword,
    });
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [filters, debouncedKeyword, searchParams, setSearchParams]);

  const selectedRentRange = useMemo(
    () => RENT_RANGE_OPTIONS.find((item) => item.id === filters.rentRangeId) || RENT_RANGE_OPTIONS[0],
    [filters.rentRangeId],
  );

  const hasActiveFilters = Boolean(
    filters.keyword.trim() ||
    filters.city !== 'all' ||
    filters.roomType !== '全部' ||
    filters.rentRangeId !== 'all' ||
    filters.managementFeeType !== 'all' ||
    filters.layout !== 'all' ||
    filters.features.length > 0 ||
    filters.sort !== 'newest',
  );

  const fetchVacantAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPublicVacantAssetsApi({
        q: debouncedKeyword || undefined,
        city: filters.city !== 'all' ? filters.city : undefined,
        roomType: filters.roomType !== '全部' ? filters.roomType : undefined,
        minRent: selectedRentRange.minRent,
        maxRent: selectedRentRange.maxRent,
        managementFeeType: filters.managementFeeType !== 'all' ? filters.managementFeeType : undefined,
        layout: filters.layout !== 'all' ? filters.layout : undefined,
        features: filters.features.length > 0 ? filters.features : undefined,
        sort: filters.sort,
      });
      console.log(data, "getPublicVacantAssetsApi");
      setAssets(data);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
        '無法載入空置招租物件清單，請確認伺服器連線後再試。',
      );
    } finally {
      setLoading(false);
    }
  }, [
    debouncedKeyword,
    filters.city,
    filters.roomType,
    selectedRentRange.minRent,
    selectedRentRange.maxRent,
    filters.managementFeeType,
    filters.layout,
    filters.features,
    filters.sort,
  ]);

  useEffect(() => {
    fetchVacantAssets();
  }, [fetchVacantAssets]);

  function handleResetFilters() {
    setFilters(INITIAL_FILTERS);
    setDebouncedKeyword('');
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 flex flex-col overflow-x-hidden">
      {/* 背景環境光暈 */}
      <div className="pointer-events-none fixed -top-48 -left-48 h-[28rem] w-[28rem] rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -right-48 h-[26rem] w-[26rem] rounded-full bg-amber-500/10 dark:bg-amber-600/8 blur-3xl" />


      <Header authStatus={authStatus} user={user} />



      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">

        <section className="space-y-3">

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            尋找您的理想租屋空間
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
            所有物件皆與物業房態系統即時同步，清楚標示月租金、管理費、坪數與樓層，幫您快速篩選最適合的質感好房。
          </p>
        </section>

        {/* 搜尋與篩選列 */}
        <FilterContent
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          loading={loading}
          totalCount={assets.length}
        />

        {/* 錯誤提示狀態 */}
        {error && (
          <div className="panel-error p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">載入資料時發生錯誤</h3>
              <p className="text-sm text-rose-600 dark:text-rose-200/80 mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchVacantAssets}
              className="btn-danger-soft gap-2 rounded-xl px-4 py-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              重新載入
            </button>
          </div>
        )}

        {/* 物件卡片清單網格 */}
        {loading ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <PropertyCardSkeleton key={`skeleton-${index}`} />
            ))}
          </section>
        ) : !error && assets.length === 0 ? (
          <section className="panel-surface py-16 px-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-500">
              <Building2 className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                目前沒有符合條件的空置招租物件
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                試著放寬租金區間、更換地點關鍵字，或清除目前的篩選條件瀏覽所有空房。
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-primary gap-2 px-5 py-2.5 text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                清除所有篩選條件
              </button>
            )}
          </section>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {assets.map((asset) => (
              <Card
                key={asset.id}
                asset={asset}
                onSelect={setSelectedAsset}
              />
            ))}
          </section>
        )}
      </main>
      <Footer />


      {/* 物件詳情彈窗 */}
      <CardDetailModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
      />
    </div>
  );
}
