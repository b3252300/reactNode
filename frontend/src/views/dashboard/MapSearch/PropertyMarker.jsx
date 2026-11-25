import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import { Building2, Layers, MapPin, Maximize2 } from 'lucide-react';
import { formatCurrency, getAssetImages } from '../Card';

function PropertyMarker({
  asset,
  position,
  isApproximate = false,
  isHovered,
  isSelected,
  selectionNonce = 0,
  onSelectMarker,
  onOpenDetail,
  onHoverChange,
}) {
  const markerRef = useRef(null);
  const isActive = isHovered || isSelected;
  const images = getAssetImages(asset);
  const coverImage = images[0] || '';

  const markerPosition = position || [asset.lat, asset.lng];

  const icon = useMemo(() => {
    const label = `NT$ ${formatCurrency(asset.monthlyRent)}`;
    const classes = [
      'price-pill-badge',
      isActive ? 'is-active' : '',
      isSelected ? 'is-selected' : '',
      isApproximate ? 'is-approximate' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const pinHtml = isSelected ? '<span class="price-pill-pin"></span>' : '';

    return L.divIcon({
      className: 'price-pill-marker-wrapper',
      html: `<div class="${classes}">${label}${pinHtml}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -22],
    });
  }, [asset.monthlyRent, isActive, isSelected, isApproximate]);

  // 點選側欄卡片或標記時，自動開啟該物件的 Popup
  useEffect(() => {
    if (!isSelected) return;
    const timer = setTimeout(() => {
      markerRef.current?.openPopup();
    }, 180);
    return () => clearTimeout(timer);
  }, [isSelected, selectionNonce]);

  const zIndexOffset = isSelected ? 2000 : isHovered ? 1000 : 0;

  return (
    <Marker
      ref={markerRef}
      position={markerPosition}
      icon={icon}
      zIndexOffset={zIndexOffset}
      eventHandlers={{
        click: () => onSelectMarker?.(asset),
        mouseover: () => onHoverChange?.(asset.id),
        mouseout: () => onHoverChange?.(null),
      }}
    >
      <Popup closeButton maxWidth={260} minWidth={240}>
        <div className="flex flex-col overflow-hidden bg-white text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
          {/* 縮圖 */}
          <div className="relative h-28 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
            {coverImage ? (
              <img
                src={coverImage}
                alt={asset.address || asset.roomNumber}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-1">
                <Building2 className="h-7 w-7 text-slate-300 dark:text-slate-700" />
                <span className="text-[11px] text-slate-500">精選招租物件</span>
              </div>
            )}
            {asset.roomType && (
              <span className="absolute top-2 left-2 rounded-md bg-slate-950/85 border border-amber-500/40 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                {asset.roomType}
              </span>
            )}
            {isApproximate && (
              <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/85 border border-slate-600/80 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                約略位置（依縣市定位）
              </span>
            )}
          </div>

          {/* 資訊區 */}
          <div className="p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                NT$ {formatCurrency(asset.monthlyRent)}
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400"> / 月</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {asset.roomNumber}
              </span>
            </div>

            <div className="flex items-start gap-1 text-xs text-slate-700 dark:text-slate-200 leading-snug">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
              <span className="line-clamp-2">
                {asset.city ? `${asset.city} ` : ''}
                {asset.address || '地址洽詢'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              {asset.area > 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5">
                  <Maximize2 className="h-2.5 w-2.5 text-slate-400" />
                  {asset.area} 坪
                </span>
              )}
              {asset.floor && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5">
                  <Layers className="h-2.5 w-2.5 text-slate-400" />
                  {asset.floor}
                </span>
              )}
              {asset.managementFee === 0 ? (
                <span className="rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 px-1.5 py-0.5 dark:text-emerald-300">
                  含管理費
                </span>
              ) : (
                <span className="rounded bg-slate-100 text-slate-700 dark:bg-slate-800/90 px-1.5 py-0.5 dark:text-slate-300">
                  管理費 {formatCurrency(asset.managementFee)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpenDetail?.(asset)}
              className="btn-primary w-full mt-1 text-xs"
            >
              查看詳情
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export default PropertyMarker;
