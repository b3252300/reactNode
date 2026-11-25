import type { ReactNode } from "react";

interface DrawerContentProps {
    children: ReactNode;
    childrenHeader?: ReactNode;
    onClose?: () => void;
}

function DrawerContent({ childrenHeader, children, onClose }: DrawerContentProps) {
    return (
        <>
            <div
                className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />
            <aside className="drawer-content" aria-label="物件詳情抽屜">
                <div className="drawer-header">
                    <div>{childrenHeader}</div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="關閉面板"
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-x w-5 h-5"
                            aria-hidden="true"
                        >
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                        </svg>
                    </button>
                </div>


                {children}
            </aside>
        </>
    );
}
export default DrawerContent;