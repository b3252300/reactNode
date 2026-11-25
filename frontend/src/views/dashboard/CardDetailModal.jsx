import { useEffect, useMemo, useState } from 'react';
import {
    Building2,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Sparkles,
    X,
    Phone,
    LineHeight
} from 'lucide-react';
import {
    formatCurrency,
    getAssetImages,
    stripHtmlToPlainText,
} from './Card';

const SAFE_HTML_TAGS = new Set([
    'P',
    'BR',
    'STRONG',
    'B',
    'EM',
    'I',
    'U',
    'S',
    'UL',
    'OL',
    'LI',
    'H1',
    'H2',
    'H3',
    'H4',
    'BLOCKQUOTE',
    'HR',
    'SPAN',
    'DIV',
]);

function sanitizeRichHtml(html) {
    if (!html) return '';
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return stripHtmlToPlainText(html);
    }

    const doc = new DOMParser().parseFromString(String(html), 'text/html');

    function cleanNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent || '');
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        const tagName = node.tagName.toUpperCase();
        if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'IFRAME' || tagName === 'OBJECT') {
            return null;
        }

        const fragment = document.createDocumentFragment();
        if (SAFE_HTML_TAGS.has(tagName)) {
            const safeEl = document.createElement(tagName.toLowerCase());
            node.childNodes.forEach((child) => {
                const cleanedChild = cleanNode(child);
                if (cleanedChild) safeEl.appendChild(cleanedChild);
            });
            return safeEl;
        }

        node.childNodes.forEach((child) => {
            const cleanedChild = cleanNode(child);
            if (cleanedChild) fragment.appendChild(cleanedChild);
        });
        return fragment;
    }

    const container = document.createElement('div');
    doc.body.childNodes.forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) container.appendChild(cleaned);
    });
    return container.innerHTML;
}

function CardDetailModal({ asset, onClose }) {
    const images = useMemo(() => getAssetImages(asset), [asset]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setActiveIndex(0);
        setCopied(false);
    }, [asset?.id]);

    useEffect(() => {
        if (!asset) return undefined;

        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                onClose();
            } else if (event.key === 'ArrowLeft' && images.length > 1) {
                setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
            } else if (event.key === 'ArrowRight' && images.length > 1) {
                setActiveIndex((prev) => (prev + 1) % images.length);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [asset, images.length, onClose]);

    if (!asset) return null;

    const safeNotesHtml = sanitizeRichHtml(asset.notes);
    const hasNotes = stripHtmlToPlainText(asset.notes).length > 0;

    async function handleCopyRoomNumber() {
        try {
            await navigator.clipboard.writeText(asset.roomNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-detail-title">
            <div
                className="dialog-surface relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl shadow-slate-900/20 dark:shadow-black/60"
                onClick={(event) => event.stopPropagation()}>

                {/* 頂部標題列 */}
                <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 dark:border-slate-800/90 dark:bg-[#0B1120]/95 backdrop-blur px-6 py-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
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
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                房屋編號 {asset.roomNumber}
                            </span>
                        </div>
                        <h2
                            id="property-detail-title"
                            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 truncate"
                        >
                            {asset.address || '精選招租物件'}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary shrink-0 rounded-xl p-2"
                        aria-label="關閉詳情視窗"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* 多圖輪播區 */}
                    <div className="space-y-3">
                        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/90 flex items-center justify-center">
                            {images.length > 0 ? (
                                <>
                                    <img
                                        src={images[activeIndex]}
                                        alt={`${asset.address} 實景照片 ${activeIndex + 1}`}
                                        className="h-full w-full object-cover"
                                    />
                                    {images.length > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
                                                }
                                                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/75 border border-slate-700/80 p-2 text-slate-100 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 transition cursor-pointer"
                                                aria-label="上一張照片"
                                            >
                                                <ChevronLeft className="h-5 w-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActiveIndex((prev) => (prev + 1) % images.length)
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/75 border border-slate-700/80 p-2 text-slate-100 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 transition cursor-pointer"
                                                aria-label="下一張照片"
                                            >
                                                <ChevronRight className="h-5 w-5" />
                                            </button>
                                            <div className="absolute bottom-3 right-3 rounded-full bg-slate-950/80 border border-slate-700/70 px-3 py-1 text-xs font-medium text-slate-200">
                                                {activeIndex + 1} / {images.length}
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                                    <Building2 className="h-14 w-14 text-slate-700" />
                                    <span className="text-sm">尚未上傳實景照片</span>
                                </div>
                            )}
                        </div>

                        {images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {images.map((imgUrl, idx) => (
                                    <button
                                        key={`${asset.id}-thumb-${idx}`}
                                        type="button"
                                        onClick={() => setActiveIndex(idx)}
                                        className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition cursor-pointer ${idx === activeIndex
                                            ? 'border-amber-400 ring-2 ring-amber-400/30'
                                            : 'border-slate-800 opacity-65 hover:opacity-100'
                                            }`}
                                    >
                                        <img
                                            src={imgUrl}
                                            alt={`縮圖 ${idx + 1}`}
                                            className="h-full w-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 租金與核心規格卡 */}
                    <div className="grid  grid-cols-6 gap-4">
                        <div className="md:col-span-2 rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white dark:border-amber-500/30 dark:from-amber-500/10 dark:to-slate-900/90 p-5 flex flex-col justify-between">
                            <div>
                                <div className="text-xs font-medium text-amber-700 dark:text-amber-300/90 mb-1">月租金</div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                                        NT$ {formatCurrency(asset.monthlyRent)}
                                    </span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">/ 月</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">管理費</span>
                                {asset.managementFee > 0 ? (
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        NT$ {formatCurrency(asset.managementFee)} / 月
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 px-2 py-0.5 text-xs font-semibold">
                                        含管理費／免管理費
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className='md:col-span-4 gap-4 flex flex-col'>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="info-tile ">
                                    <div className="text-xs text-slate-500 dark:text-slate-400" style={{ lineHeight: 1 }}>房屋類型</div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {asset.roomType || '未分類'}
                                    </div>
                                </div>
                                <div className="info-tile">
                                    <div className="text-xs text-slate-500 dark:text-slate-400">坪數</div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {asset.area > 0 ? `${asset.area} 坪` : '依現場為準'}
                                    </div>
                                </div>
                                <div className="info-tile">
                                    <div className="text-xs text-slate-500 dark:text-slate-400">樓層</div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {asset.floor || '未標註'}
                                    </div>
                                </div>

                            </div>

                            {Array.isArray(asset?.featuresText) && asset.featuresText.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1">
                                    {asset.featuresText.map((feature) => (
                                        <span
                                            key={feature}
                                            className="badge-emerald text-sm"
                                        >
                                            {feature}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={console.log("fghfhg")}
                                className="btn-primary"
                            >
                                <Phone className='w-5' />   預約看房
                            </button>
                        </div>

                    </div>

                    {/* 物件詳細介紹 */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 p-5">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                            物件特色與設備說明
                        </h3>
                        {hasNotes ? (
                            <div
                                className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold"
                                dangerouslySetInnerHTML={{ __html: safeNotesHtml }}
                            />
                        ) : (
                            <p className="text-sm text-slate-500">
                                房東尚未填寫詳細設備說明，歡迎記下房號預約現場看屋。
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CardDetailModal;