import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuBadge,
} from "@/components/ui/sidebar"
import { Building2, ShieldCheck, DollarSign, Wrench, Users, House } from "lucide-react"

type AppSidebarProps = {
    activePath: string
    handleSidebarClick: (path: string) => void
    assetCount?: number
    pendingRepairCount?: number
    userName?: string
    userEmail?: string
}

export function AppSidebar({
    activePath,
    handleSidebarClick,
    assetCount = 0,
    pendingRepairCount = 0,
    userName,
    userEmail,
}: AppSidebarProps) {
    const isActive = (path: string) => {
        if (path === "/property-status-assets") {
            return (
                activePath === "/" ||
                activePath === "/property-status-assets" ||
                activePath === "/propertyStatusAssets" ||
                activePath.startsWith("/property-status-assets/")
            )
        }
        return activePath === path || activePath.startsWith(`${path}/`)
    }

    const displayName = userName
    const displaySub = userEmail
    const avatarText = displayName.slice(0, 2)

    return (
        <Sidebar className="sidebar-container" collapsible="icon">
            <SidebarHeader className="sidebar-header p-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                <div
                    onClick={() => handleSidebarClick("/property-status-assets")}
                    className="flex items-center space-x-3.5 cursor-pointer group-data-[collapsible=icon]:space-x-0 group-data-[collapsible=icon]:justify-center"
                >
                    <div className="brand-logo font-black">
                        <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
                    </div>
                    <div className="group-data-[collapsible=icon]:hidden">
                            <div className="font-extrabold text-base tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5 whitespace-nowrap">
                                房屋人資產
                            </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                    智慧物業包租代管系統
                                </div>
                            </div>
                        </div>
                    </SidebarHeader>

                    <SidebarContent className="p-4 group-data-[collapsible=icon]:p-2">
                        <SidebarGroup className="p-0">
                            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 group-data-[collapsible=icon]:hidden">
                                核心營運模組
                            </div>
                            <SidebarMenu className="gap-2">
                                <SidebarMenuItem className="sidebar-menu-item">
                                    <SidebarMenuButton
                                        isActive={isActive("/property-status-assets")}
                                        tooltip="房態與資產盤"
                                        className="sidebar-menu-btn"
                                        onClick={() => handleSidebarClick("/property-status-assets")}
                                    >
                                        <Building2 className="w-5 h-5 shrink-0" />
                                        <span className="font-medium text-[15px]">房態與資產盤</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuBadge className="badge right-3 group-data-[collapsible=icon]:hidden">
                                        {assetCount}
                                    </SidebarMenuBadge>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isActive("/financial-chart")}
                                        tooltip="財務收支圖表"
                                        className="sidebar-menu-btn"
                                        onClick={() => handleSidebarClick("/financial-chart")}
                                    >
                                        <DollarSign className="w-5 h-5 shrink-0" />
                                        <span className="font-medium text-[15px]">財務收支圖表</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isActive("/butler-repair-request")}
                                        tooltip="管家報修派工"
                                        className="sidebar-menu-btn"
                                        onClick={() => handleSidebarClick("/butler-repair-request")}
                                    >
                                        <Wrench className="w-5 h-5 shrink-0" />
                                        <span className="font-medium text-[15px]">管家報修派工</span>
                                    </SidebarMenuButton>
                                    {pendingRepairCount > 0 && (
                                        <SidebarMenuBadge className="badge right-3 group-data-[collapsible=icon]:hidden !bg-amber-500/20 !text-amber-300 border border-amber-500/30">
                                            {pendingRepairCount}
                                        </SidebarMenuBadge>
                                    )}
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isActive("/members")}
                                        tooltip="管理員名冊"
                                        className="sidebar-menu-btn"
                                        onClick={() => handleSidebarClick("/members")}
                                    >
                                        <Users className="w-5 h-5 shrink-0" />
                                        <span className="font-medium text-[15px]">管理團隊名冊</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={isActive("/")}
                                        tooltip="首頁"
                                        className="sidebar-menu-btn"
                                        onClick={() => handleSidebarClick("/")}
                                    >
                                        <House />

                                        <span className="font-medium text-[15px]">首頁</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroup>
                    </SidebarContent>

                    <SidebarFooter className="sidebar-footer p-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                        <div className="sidebarFooter-container group-data-[collapsible=icon]:justify-center w-full">
                            <div className="flex items-center space-x-3 group-data-[collapsible=icon]:space-x-0 group-data-[collapsible=icon]:justify-center overflow-hidden">
                                <div className="user-photo shadow-md shrink-0 font-bold text-xs">
                                    {avatarText}
                                </div>
                                <div className="group-data-[collapsible=icon]:hidden min-w-0">
                                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                            {displayName}
                                        </div>
                                        <div className="text-[11px] text-slate-500 truncate">
                                            {displaySub}
                                        </div>
                                    </div>
                                </div>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-sparkles w-4 h-4 text-amber-400/80 animate-pulse group-data-[collapsible=icon]:hidden shrink-0"
                                    aria-hidden="true"
                                >
                                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
                                    <path d="M20 3v4"></path>
                                    <path d="M22 5h-4"></path>
                                    <path d="M4 17v2"></path>
                                    <path d="M5 18H3"></path>
                                </svg>
                            </div>
                    </SidebarFooter>
                </Sidebar>
                )
}
