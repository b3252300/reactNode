function footer() {
    return (<footer className="relative z-10 border-t border-slate-200 bg-white/80 dark:border-slate-800/70 dark:bg-[#090d16]/80 py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>© {new Date().getFullYear()} 房屋人資產 — 智慧物業包租代管系統</div>
            <div>公開房源資訊僅供參考，實際租賃條件以現場看屋與正式合約為準</div>
        </div>
    </footer>)
}
export default footer;