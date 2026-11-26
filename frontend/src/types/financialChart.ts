import type { PropertyStatus } from '@/types/propertyStatusAssets';

/**
 * 營收趨勢統計區間
 * - 6m：近 6 個月
 * - 12m：近 12 個月
 */
export type FinancialPeriod = '6m' | '12m';

/** 財務總覽指標（頂部 KPI 卡片） */
export interface FinancialMetrics {
  /** 本月應收租金（出租中／即將到期／欠租物件的月租＋管理費加總，NT$） */
  expectedMonthlyRent: number;
  /** 本月預估實收（應收租金 − 欠租總額，NT$） */
  collectedEstimate: number;
  /** 欠租總金額（NT$） */
  totalOverdue: number;
  /** 押金總額（有租約物件的押金加總，NT$） */
  totalDeposit: number;
  /** 平均每坪租金（應收租金 ÷ 出租總坪數，NT$／坪） */
  avgRentPerPing: number;
  /** 空置＋維護中物件的潛在租金（若全部租出可增加的月收入，NT$） */
  potentialVacantRent: number;
  /** 收租率（百分比字串，保留一位小數，例如 "95.3"） */
  collectionRate: string;
  /** 欠租物件數量 */
  overdueCount: number;
  /** 物件總數 */
  totalAssets: number;
}

/** 依房型統計的收益結構 */
export interface RoomTypeRevenueItem {
  /** 房型名稱（未填寫時為「其他房型」） */
  roomType: string;
  /** 此房型的物件數量 */
  count: number;
  /** 此房型月租金加總（NT$） */
  revenue: number;
  /** 此房型佔總租金的比例（整數百分比，例如 35 代表 35%） */
  share: number;
}

/** 月營收趨勢圖的單一資料點 */
export interface MonthlyRevenuePoint {
  /** X 軸標籤（例如「5月」、「本月」） */
  label: string;
  /** 當月應收金額（NT$） */
  expected: number;
  /** 當月實收金額（NT$） */
  collected: number;
  /** 是否為本月（用於高亮顯示） */
  isCurrent: boolean;
}

/** 財務明細表中的單一物件 */
export interface FinancialAssetItem {
  /** 物件唯一識別碼 */
  id: string;
  /** 房號 */
  roomNumber: string;
  /** 物件地址 */
  address: string;
  /** 樓層（例如 "5F"、"5/12"） */
  floor: string;
  /** 房型（如：獨立套房、整層住家） */
  roomType: string;
  /** 坪數 */
  area: number;
  /** 房屋狀態代碼 */
  status: PropertyStatus;
  /** 房屋狀態中文顯示文字 */
  statusText: string;
  /** 房客姓名（空置時為空字串） */
  tenantName: string;
  /** 月租金（NT$） */
  monthlyRent: number;
  /** 管理費（NT$／月） */
  managementFee: number;
  /** 押金（NT$） */
  deposit: number;
  /** 欠租金額（NT$） */
  overdueAmount: number;
  /** 租約到期日（ISO 8601 字串，無租約時為空字串） */
  leaseEndDate: string;
}

/** 財務圖表 API 回應 */
export interface FinancialChartResponse {
  /** 本次查詢的統計區間 */
  period: FinancialPeriod;
  /** 財務總覽指標 */
  metrics: FinancialMetrics;
  /** 依房型的收益結構（依收益由高到低排序） */
  roomTypeBreakdown: RoomTypeRevenueItem[];
  /** 月營收趨勢資料 */
  monthlySeries: MonthlyRevenuePoint[];
  /** 財務明細物件列表 */
  items: FinancialAssetItem[];
}
