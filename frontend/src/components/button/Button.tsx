function Button({ size, className = '', ...props }: { className?: string; children: React.ReactNode;[key: string]: any }) {
    // 使用者有傳入 bg-*、hover:* 或啟用 tab 樣式時以使用者為準，否則使用預設樣式
    const hasBg = /(^|\s)(bg-|tab-btn-soft-active)/.test(className)
    const isTabActive = className.includes('tab-btn-soft-active')
    const hasHover = /(^|\s)(dark:)?hover:/.test(className)

    const bgClass = hasBg ? '' : 'bg-transparent text-slate-700 dark:text-white'
    const hoverClass = hasHover
        ? ''
        : isTabActive
            ? 'hover:bg-amber-100/80 dark:hover:bg-amber-500/20'
            : hasBg
                ? 'hover:opacity-90'
                : 'hover:border-amber-400 hover:bg-amber-50/70 hover:text-amber-700 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/10 dark:hover:text-amber-300'

    const sizes = () => {
        if (size === 'sm') {
            return 'text-xs px-3 py-1.5'
        }
        if (size === 'md') {
            return 'text-sm px-4 py-2'
        }
        if (size === 'lg') {
            return 'text-base px-6 py-3'
        }
        return 'px-3 py-1.5'
    }

    const sizeClass = sizes();

    return (
        <button
            className={`${bgClass} ${hoverClass} ${sizeClass} cursor-pointer rounded-lg font-medium border transition flex items-center gap-1.5 disabled:pointer-events-none disabled:opacity-50 ${className}`}
            {...props}
        />
    )
}
export default Button