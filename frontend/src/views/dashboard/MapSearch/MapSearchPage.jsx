import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import {
  AlertCircle,
  Building2,
  Layers,
  List,
  Map as MapIcon,
  MapPin,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react';
import { getPublicVacantAssetsApi } from '../../../api/home';
import {
  getCityMapView,
  TAIWAN_CITIES,
  TAIWAN_CITY_COORDINATES,
  TAIWAN_DEFAULT_MAP_VIEW,
} from '@/constants/taiwanCities';
import { useAuth } from '../../auth/AuthContext';
import Header from '../Header';
import CardDetailModal from '../CardDetailModal';
import { INITIAL_FILTERS, RENT_RANGE_OPTIONS } from '../Filter';
import { formatCurrency, getAssetImages } from '../Card';
import {
  buildSearchParamsFromFilters,
  parseFiltersFromSearchParams,
} from '../filterQueryParams';
import MapFilterBar from './MapFilterBar';
import PropertyMarker from './PropertyMarker';
import MapController from './MapController';
import './MapSearch.css';

const STANDARD_TILE_LAYER = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div class="custom-cluster-badge">${count}</div>`,
    className: 'custom-cluster-wrapper',
    iconSize: L.point(40, 40, true),
  });
}

function hasValidCoordinates(asset) {
  return (
    typeof asset?.lat === 'number' &&
    Number.isFinite(asset.lat) &&
    typeof asset?.lng === 'number' &&
    Number.isFinite(asset.lng)
  );
}

// 依物件 ID 產生穩定的微幅偏移，避免同縣市多筆約略定位物件完全重疊
function getDeterministicOffset(id) {
  const str = String(id || '');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 10000;
  }
  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = 0.004 + ((hash % 7) * 0.0018);
  return [Math.sin(angle) * radius, Math.cos(angle) * radius];
}

function inferCityFromAsset(asset) {
  const rawCity = String(asset?.city || '').trim().replace(/^臺/, '台');
  if (rawCity && TAIWAN_CITY_COORDINATES[rawCity]) {
    return rawCity;
  }
  const normalizedAddress = String(asset?.address || '').replace(/臺/g, '台');
  return TAIWAN_CITIES.find((cityName) => normalizedAddress.includes(cityName)) || null;
}

function resolveAssetMapPosition(asset) {
  if (hasValidCoordinates(asset)) {
    return {
      position: [asset.lat, asset.lng],
      zoom: 15,
      isApproximate: false,
    };
  }
  const inferredCity = inferCityFromAsset(asset);
  const baseView = inferredCity
    ? TAIWAN_CITY_COORDINATES[inferredCity]
    : TAIWAN_DEFAULT_MAP_VIEW;
  const [dLat, dLng] = getDeterministicOffset(asset?.id);
  return {
    position: [baseView.center[0] + dLat, baseView.center[1] + dLng],
    zoom: inferredCity ? Math.max(baseView.zoom, 13) : 9,
    isApproximate: true,
  };
}

function CompactPropertySkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#0B1120] p-3 animate-pulse">
      <div className="h-24 w-28 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-800/80" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-800/80" />
        <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800/60" />
        <div className="h-5 w-28 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

export default function MapSearchPage() {
  const { user, status: authStatus } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => parseFiltersFromSearchParams(searchParams));
  const [debouncedKeyword, setDebouncedKeyword] = useState(() => (searchParams.get('q') || '').trim());

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 地圖視角與邊界搜尋狀態
  const initialMapView = useMemo(() => getCityMapView(filters.city), []);
  const [flyTarget, setFlyTarget] = useState(null);
  const [pendingBounds, setPendingBounds] = useState(null);
  const [activeBounds, setActiveBounds] = useState(null);

  // 雙向聯動與詳情彈窗狀態
  const [hoveredAssetId, setHoveredAssetId] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectionNonce, setSelectionNonce] = useState(0);
  const [detailAsset, setDetailAsset] = useState(null);

  // 行動版檢視切換（map | list）
  const [mobileView, setMobileView] = useState('map');
  const [resizeTrigger, setResizeTrigger] = useState(0);

  const cardRefs = useRef({});

  // 關鍵字防抖
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
    filters.sort !== 'newest',
  );

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));

    if (field === 'city') {
      // 切換縣市時先清除舊地圖邊界，避免把新縣市物件濾掉
      setActiveBounds(null);
      setPendingBounds(null);
      const nextView = getCityMapView(value);
      setFlyTarget({ ...nextView, nonce: Date.now() });
    }
  }, []);

  const handleResetAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setDebouncedKeyword('');
    setActiveBounds(null);
    setPendingBounds(null);
    setSelectedAssetId(null);
    setFlyTarget({ ...TAIWAN_DEFAULT_MAP_VIEW, nonce: Date.now() });
  }, []);

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
        sort: filters.sort,
        ...(activeBounds
          ? {
            north: activeBounds.north,
            south: activeBounds.south,
            east: activeBounds.east,
            west: activeBounds.west,
          }
          : {}),
      });
      setAssets(data);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
        '無法載入空置招租物件，請確認伺服器連線後再試。',
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
    filters.sort,
    activeBounds,
  ]);

  useEffect(() => {
    fetchVacantAssets();
  }, [fetchVacantAssets]);

  const mappedAssets = useMemo(
    () =>
      assets.map((asset) => ({
        asset,
        ...resolveAssetMapPosition(asset),
      })),
    [assets],
  );

  const exactLocatedCount = useMemo(
    () => mappedAssets.filter((item) => !item.isApproximate).length,
    [mappedAssets],
  );
  const approximateCount = mappedAssets.length - exactLocatedCount;

  const selectedMappedItem = useMemo(
    () => mappedAssets.find((item) => item.asset.id === selectedAssetId) || null,
    [mappedAssets, selectedAssetId],
  );

  const clusteredMappedItems = useMemo(
    () => mappedAssets.filter((item) => item.asset.id !== selectedAssetId),
    [mappedAssets, selectedAssetId],
  );

  const handleUserMoveEnd = useCallback((bounds) => {
    setPendingBounds(bounds);
  }, []);

  const handleSearchThisArea = useCallback(() => {
    if (!pendingBounds) return;
    setActiveBounds(pendingBounds);
    setPendingBounds(null);
  }, [pendingBounds]);

  const handleResetBounds = useCallback(() => {
    setActiveBounds(null);
    setPendingBounds(null);
  }, []);

  const handleSelectMarker = useCallback((asset) => {
    setSelectedAssetId(asset.id);
    setSelectionNonce((prev) => prev + 1);
    const cardEl = cardRefs.current[asset.id];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  const handleSelectSidebarCard = useCallback((asset) => {
    const resolved = resolveAssetMapPosition(asset);
    setSelectedAssetId(asset.id);
    setSelectionNonce((prev) => prev + 1);
    setFlyTarget({
      center: resolved.position,
      zoom: resolved.zoom,
      nonce: Date.now(),
    });
    setMobileView('map');
    setResizeTrigger((prev) => prev + 1);
  }, []);

  const handleToggleMobileView = useCallback(() => {
    setMobileView((prev) => {
      const next = prev === 'map' ? 'list' : 'map';
      if (next === 'map') {
        setResizeTrigger((count) => count + 1);
      }
      return next;
    });
  }, []);

  return (
    <div className="map-search-container h-screen flex flex-col overflow-hidden bg-slate-100 text-slate-900 dark:bg-[#090d16] dark:text-slate-100">
      <Header authStatus={authStatus} user={user} />

      <MapFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetAll}
        hasActiveFilters={hasActiveFilters}
        hasBoundsFilter={Boolean(activeBounds)}
      />

      {/* 下方滿版分欄區 */}
      <div className="relative flex-1 min-h-0 flex overflow-hidden">
        {/* 左側可捲動物件清單 */}
        <aside
          className={`${mobileView === 'list' ? 'flex' : 'hidden lg:flex'
            } w-full lg:w-[400px] xl:w-[430px] shrink-0 flex-col border-r border-slate-100 bg-slate-100 dark:border-slate-800/80 dark:bg-[#090d16] min-h-0`}
        >
          {/* 清單統計列 */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-white/90 text-slate-600 dark:border-slate-800/80 dark:bg-[#0B1120]/70 text-xs dark:text-slate-300">
            <div>
              {loading ? (
                <span>正在載入空置招租物件...</span>
              ) : (
                <span>
                  共找到 <strong className="text-amber-600 dark:text-amber-400 font-bold">{assets.length}</strong> 間空房
                  {activeBounds && (
                    <span className="badge-amber ml-1.5 px-1.5 text-[11px]">
                      地圖範圍內
                    </span>
                  )}
                </span>
              )}
            </div>
            {!loading && mappedAssets.length > 0 && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                精準定位 {exactLocatedCount} 筆
                {approximateCount > 0 ? ` · 約略 ${approximateCount} 筆` : ''}
              </span>
            )}
          </div>

          {/* 錯誤提示 */}
          {error && (
            <div className="panel-error m-3 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">載入失敗</div>
              <p className="text-xs text-rose-600 dark:text-rose-200/80">{error}</p>
              <button
                type="button"
                onClick={fetchVacantAssets}
                className="btn-danger-soft"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                重新載入
              </button>
            </div>
          )}

          {/* 清單內容 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <CompactPropertySkeleton key={`map-skeleton-${idx}`} />
              ))
            ) : !error && assets.length === 0 ? (
              <div className="panel-surface rounded-xl py-12 px-5 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-500">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    目前範圍內沒有符合條件的空房
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    可以拖曳地圖擴大搜尋區域，或重設篩選條件檢視所有房源。
                  </p>
                </div>
                {(hasActiveFilters || activeBounds) && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="btn-primary gap-1.5 px-4 py-2 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    重設全部條件
                  </button>
                )}
              </div>
            ) : (
              assets.map((asset) => {
                const images = getAssetImages(asset);
                const coverImage = images[0] || '';
                const isSelected = selectedAssetId === asset.id;
                const isHovered = hoveredAssetId === asset.id;
                const isLocated = hasValidCoordinates(asset);

                return (
                  <article
                    key={asset.id}
                    ref={(el) => {
                      if (el) {
                        cardRefs.current[asset.id] = el;
                      } else {
                        delete cardRefs.current[asset.id];
                      }
                    }}
                    onClick={() => handleSelectSidebarCard(asset)}
                    onMouseEnter={() => setHoveredAssetId(asset.id)}
                    onMouseLeave={() => setHoveredAssetId(null)}
                    className={`group flex gap-3 rounded-xl border p-3 transition-all duration-150 cursor-pointer ${isSelected
                      ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-500/10 dark:border-amber-400 dark:bg-amber-500/10'
                      : isHovered
                        ? 'border-amber-400 bg-white shadow-sm dark:border-amber-500/60 dark:bg-[#0f172a]'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800/90 dark:bg-[#0B1120] dark:hover:border-slate-700'
                      }`}
                  >
                    {/* 縮圖 */}
                    <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={asset.address || asset.roomNumber}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                          <Building2 className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                        </div>
                      )}
                      {!isLocated && (
                        <span className="absolute bottom-1 left-1 rounded bg-slate-950/85 border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">
                          約略定位
                        </span>
                      )}
                    </div>

                    {/* 右側資訊 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                          {asset.city && (
                            <span className="badge-neutral border-transparent px-1.5 text-[11px]">
                              {asset.city}
                            </span>
                          )}
                          {asset.roomType && (
                            <span className="badge-amber px-1.5 text-[11px]">
                              {asset.roomType}
                            </span>
                          )}
                          {asset.area > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-slate-400">
                              <Maximize2 className="h-2.5 w-2.5" />
                              {asset.area}坪
                            </span>
                          )}
                          {asset.floor && (
                            <span className="inline-flex items-center gap-0.5 text-slate-400">
                              <Layers className="h-2.5 w-2.5" />
                              {asset.floor}
                            </span>
                          )}
                        </div>

                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition truncate flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                          <span className="truncate">{asset.address || '地址洽詢'}</span>
                        </h2>
                      </div>
                      {Array.isArray(asset?.featuresText) && asset.featuresText.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {asset.featuresText.map((feature) => (
                            <span
                              key={feature}
                              className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-end justify-between gap-2 pt-1.5">
                        <div>
                          <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                            NT$ {formatCurrency(asset.monthlyRent)}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400"> / 月</span>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailAsset(asset);
                          }}
                          className="btn-secondary px-2.5 py-1 text-[11px] dark:bg-slate-900 dark:hover:bg-amber-500/15"
                        >
                          查看詳情
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </aside>

        {/* 右側互動地圖 */}
        <section
          className={`${mobileView === 'map' ? 'block' : 'hidden lg:block'
            } flex-1 relative min-h-0`}
        >
          <MapContainer
            center={initialMapView.center}
            zoom={initialMapView.zoom}
            className="h-full w-full z-0"
            scrollWheelZoom
          >
            <TileLayer
              url={STANDARD_TILE_LAYER.url}
              attribution={STANDARD_TILE_LAYER.attribution}
            />

            <MapController
              flyTarget={flyTarget}
              resizeTrigger={resizeTrigger}
              onUserMoveEnd={handleUserMoveEnd}
            />

            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={createClusterIcon}
              showCoverageOnHover={false}
              maxClusterRadius={48}
            >
              {clusteredMappedItems.map(({ asset, position, isApproximate }) => (
                <PropertyMarker
                  key={asset.id}
                  asset={asset}
                  position={position}
                  isApproximate={isApproximate}
                  isHovered={hoveredAssetId === asset.id}
                  isSelected={false}
                  onSelectMarker={handleSelectMarker}
                  onOpenDetail={setDetailAsset}
                  onHoverChange={setHoveredAssetId}
                />
              ))}
            </MarkerClusterGroup>

            {/* 目前點選中的物件獨立於群聚外層，確保一定顯示標記並自動展開 Popup */}
            {selectedMappedItem && (
              <PropertyMarker
                key={`selected-${selectedMappedItem.asset.id}`}
                asset={selectedMappedItem.asset}
                position={selectedMappedItem.position}
                isApproximate={selectedMappedItem.isApproximate}
                isHovered={hoveredAssetId === selectedMappedItem.asset.id}
                isSelected
                selectionNonce={selectionNonce}
                onSelectMarker={handleSelectMarker}
                onOpenDetail={setDetailAsset}
                onHoverChange={setHoveredAssetId}
              />
            )}
          </MapContainer>

          {/* 地圖上方中央：搜尋此區域 / 重設地圖範圍 */}
          {(pendingBounds || activeBounds) && (
            <div className="pointer-events-none absolute top-4 inset-x-0 z-[400] flex justify-center gap-2 px-4">
              {pendingBounds && (
                <button
                  type="button"
                  onClick={handleSearchThisArea}
                  className="btn-primary pointer-events-auto gap-2 rounded-full font-bold text-xs sm:text-sm px-4 py-2 shadow-xl shadow-black/50"
                >
                  <Search className="h-4 w-4" />
                  搜尋此地圖區域
                </button>
              )}
              {activeBounds && (
                <button
                  type="button"
                  onClick={handleResetBounds}
                  className="btn-secondary pointer-events-auto rounded-full bg-white/95 dark:bg-[#0B1120]/95 sm:text-sm px-3.5 py-2 shadow-xl shadow-slate-900/15 dark:shadow-black/50 backdrop-blur"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  重設地圖範圍
                </button>
              )}
            </div>
          )}

          {/* 左下角：約略定位物件提示徽章 */}
          {!loading && approximateCount > 0 && (
            <div className="absolute bottom-6 left-4 z-[400] max-w-xs">
              <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white/95 text-slate-700 dark:border-amber-500/35 dark:bg-[#0B1120]/92 px-3.5 py-2 text-xs dark:text-slate-200 shadow-lg shadow-slate-900/15 dark:shadow-black/50 backdrop-blur">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                <span>
                  有 <strong className="text-amber-600 dark:text-amber-300">{approximateCount}</strong> 筆物件以縣市約略位置標記（虛線外框），點選卡片即可在地圖檢視
                </span>
              </div>
            </div>
          )}
        </section>

        {/* 行動版底部浮動切換鈕 */}
        <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-[500]">
          <button
            type="button"
            onClick={handleToggleMobileView}
            className="btn-primary gap-2 rounded-full font-bold text-xs px-5 py-2.5 shadow-2xl shadow-black/70"
          >
            {mobileView === 'map' ? (
              <>
                <List className="h-4 w-4" />
                <span>列表檢視 ({assets.length})</span>
              </>
            ) : (
              <>
                <MapIcon className="h-4 w-4" />
                <span>地圖檢視</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 既有的物件詳情彈窗 */}
      <CardDetailModal
        asset={detailAsset}
        onClose={() => setDetailAsset(null)}
      />
    </div>
  );
}
