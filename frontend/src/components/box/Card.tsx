function Card({ className, isGap, ...props }: { className?: string; isGap?: string;[key: string]: any }) {
    const gap = isGap ? isGap : 'gap-4';
    return (
        <div className={`flex flex-wrap ${gap} bg-white dark:bg-[#0B1120] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-none ${className}`}
            {...props}
        >

        </div>
    )
}
export default Card