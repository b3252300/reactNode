import {
    Building2,
    Images,
    Layers,
    MapPin,
    Maximize2,
} from 'lucide-react';

export function stripHtmlToPlainText(html) {
    if (!html) return '';
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export function formatCurrency(value) {
    return Number(value || 0).toLocaleString('zh-TW');
}

export function getAssetImages(asset) {
    if (Array.isArray(asset?.imageUrls) && asset.imageUrls.length > 0) {
        return asset.imageUrls;
    }
    if (asset?.imageUrl) {
        return [asset.imageUrl];
    }
    return [];
}

export function PropertyCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#0B1120] animate-pulse">
            <div className="aspect-[16/10] w-full bg-slate-200 dark:bg-slate-800/70" />
            <div className="p-5 space-y-3.5">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-16 rounded-md bg-slate-200 dark:bg-slate-800" />
                    <div className="h-5 w-12 rounded-md bg-slate-200 dark:bg-slate-800" />
                    <div className="h-5 w-14 rounded-md bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-5 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-2/5 rounded bg-slate-100 dark:bg-slate-800/70" />
                <div className="h-9 w-full rounded bg-slate-100 dark:bg-slate-800/50" />
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="h-6 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
                </div>
            </div>
        </div>
    );
}

function Card({ asset, onSelect }) {
    const images = getAssetImages(asset);
    const coverImage = images[0] || '';
    const notesPreview = stripHtmlToPlainText(asset.notes);

    return (
        <article
            onClick={() => onSelect?.(asset)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10 dark:border-slate-800/90 dark:bg-[#0B1120] dark:shadow-none dark:hover:border-amber-500/50 dark:hover:shadow-amber-500/5 transition-all duration-200 cursor-pointer"
        >
            {/* 封面圖區 */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt={asset.address || asset.roomNumber}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-900 dark:via-slate-800/70 dark:to-slate-950 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                        <Building2 className="h-12 w-12 text-slate-300 dark:text-slate-700 group-hover:text-amber-500/60 transition" />
                        <span className="text-xs font-medium text-slate-500">
                            精選招租物件
                        </span>
                    </div>
                )}

                {/* 漸層遮罩 */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/80 to-transparent" />



                {/* 右上：管理費標籤 */}
                {/* <div className="absolute top-3 right-3">
             
                </div> */}

                {/* 右下：多圖張數徽章 */}
                {images.length > 1 && (
                    <div className="absolute bottom-2.5 right-3 inline-flex items-center gap-1 rounded-md bg-slate-950/80 backdrop-blur border border-slate-700/70 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                        <Images className="h-3 w-3 text-amber-400" />
                        1/{images.length}
                    </div>
                )}
            </div>

            {/* 卡片資訊內容 */}
            <div className="flex flex-1 flex-col p-3 space-y-3.5">
                {Array.isArray(asset?.featuresText) && asset.featuresText.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                        {asset.featuresText.map((feature) => (
                            <span
                                key={feature}
                                className="badge-emerald text-[11px]"
                            >
                                {feature}
                            </span>
                        ))}
                    </div>
                )}
                {/* 縣市、房屋類型、樓層、坪數 */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {asset.city && (
                        <span className="badge-neutral">
                            {asset.city}
                        </span>
                    )}
                    {asset.roomType && (
                        <span className="badge-amber">
                            {asset.roomType}
                        </span>
                    )}
                    {asset.floor && (
                        <span className="badge-neutral border-transparent font-normal">

                            {asset.floor} F
                        </span>
                    )}
                    {asset.area > 0 && (
                        <span className="badge-neutral border-transparent font-normal">
                            <Maximize2 className="h-3 w-3 text-slate-400" />
                            {asset.area} 坪
                        </span>
                    )}
                    {
                        asset.managementFee > 0 && (
                            <span className="badge-neutral border-transparent font-normal">
                                管理費 NT$ {formatCurrency(asset.managementFee)}/月
                            </span>
                        )
                    }




                </div>

                {/* 地址與房號 */}
                <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition line-clamp-1 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                        <span className="truncate">{asset.address || '地址洽詢'}</span>
                    </h2>
                    <div className="text-xs font-mono text-slate-500 pl-5">
                        房號：{asset.roomNumber}
                    </div>
                </div>

                {/* 設備與特色摘要 */}
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                    {notesPreview || '點擊檢視完整房屋資訊與實景照片。'}
                </p>

                {/* 底部價格與詳情按鈕 */}
                <div className="mt-auto pt-3.5 border-t border-slate-200 dark:border-slate-800/80 flex items-end justify-between gap-2">
                    <div>
                        <div className="text-[11px] text-slate-500">月租金</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                                NT$ {formatCurrency(asset.monthlyRent)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">/ 月</span>
                        </div>
                    </div>

                    <span className="btn-secondary group-hover:border-amber-500/60 group-hover:bg-amber-50 group-hover:text-amber-700 dark:bg-slate-900 dark:group-hover:bg-amber-500/10 dark:group-hover:text-amber-300">
                        查看詳情
                    </span>
                </div>
            </div>
        </article>
    );
}

export default Card;