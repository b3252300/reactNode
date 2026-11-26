/**
 * 工單處理狀態
 * - pending：待處理（剛建立、尚未派工）
 * - in_progress：管家勘查處理中
 * - completed：已驗收完修結案
 */
export type TicketStatus = "pending" | "in_progress" | "completed";

/**
 * 工單優先級
 * - urgent：緊急
 * - normal：一般
 * - inspection：點交／巡檢
 */
export type TicketPriority = "urgent" | "normal" | "inspection";

/** 報修／派工單 */
export interface RepairTicket {
  /** 工單唯一識別碼（資料庫 _id） */
  id: string;
  /** 工單編號，顯示用（格式如 WO-xxxx） */
  ticketCode: string;
  /** 報修房號 */
  roomNumber: string;
  /** 物件地址 */
  address: string;
  /** 聯絡房客姓名 */
  tenantName: string;
  /** 派工類別（如：水電修繕、家電冷氣、退租點交等） */
  category: string;
  /** 報修／派工事項說明標題 */
  title: string;
  /** 指派的外勤管家姓名 */
  butlerName: string;
  /** 工單優先級 */
  priority: TicketPriority;
  /** 目前處理狀態 */
  status: TicketStatus;
  /** 預估修繕費用（NT$） */
  estimatedCost: number;
  /** 建立時間（ISO 8601 字串） */
  createdAt: string;
}

/** 工單數量統計*/
export interface RepairTicketCounts {
  /** 全部工單數 */
  all: number;
  /** 待處理工單數 */
  pending: number;
  /** 處理中工單數 */
  in_progress: number;
  /** 已結案工單數 */
  completed: number;
  /** 所有工單預估費用加總（NT$） */
  totalCost: number;
}

/** 新增派工時可選擇的房號選項 */
export interface RepairRoomOption {
  /** 物件唯一識別碼 */
  id: string;
  /** 房號 */
  roomNumber: string;
  /** 房型（如：獨立套房、整層住家） */
  roomType: string;
  /** 物件地址（選擇房號時自動帶入） */
  address: string;
  /** 目前房客姓名（選擇房號時自動帶入） */
  tenantName: string;
}

/** 取得工單列表 */
export interface RepairTicketListResponse {
  /** 工單列表 */
  tickets: RepairTicket[];
  /** 各狀態數量統計 */
  counts: RepairTicketCounts;
  /** 新增派工對話框用的房號下拉選項 */
  roomOptions: RepairRoomOption[];
}

/** 新增工單請求參數 */
export interface CreateRepairTicketInput {
  /** 報修房號 */
  roomNumber: string;
  /** 物件地址（選擇房號時自動帶入） */
  address?: string;
  /** 聯絡房客姓名（選擇房號時自動帶入） */
  tenantName?: string;
  /** 派工類別（如：水電修繕、家電冷氣、退租點交等） */
  category: string;
  /** 報修／派工事項說明標題 */
  title: string;
  /** 指派的外勤管家姓名 */
  butlerName: string;
  /** 工單優先級（urgent / normal / inspection） */
  priority?: TicketPriority;
  /** 目前處理狀態 */
  status?: TicketStatus;
  /** 預估修繕費用（NT$） */
  estimatedCost?: number;
}

/** 更新工單請求參數（所有欄位皆可選，只送要修改的欄位） */
export type UpdateRepairTicketInput = Partial<CreateRepairTicketInput>;
