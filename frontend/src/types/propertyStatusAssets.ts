/**
 * 房屋狀態
 * - rented：出租中
 * - vacant：空置招租中
 * - overdue：欠租
 * - expiring：租約即將到期
 * - maintenance：裝修／維護中
 */
export type PropertyStatus =
  | 'rented'
  | 'vacant'
  | 'overdue'
  | 'expiring'
  | 'maintenance';

/** 物件清單的狀態篩選值（'all' 代表不篩選） */
export type PropertyStatusFilter = 'all' | PropertyStatus;

/** 租屋物件（房屋資產） */
export interface PropertyAsset {
  /** 物件唯一識別碼（資料庫 _id） */
  id: string;
  /** 房號（由後端產生） */
  roomNumber: string;
  /** 所在縣市（例如「台北市」） */
  city: string;
  /** 物件地址 */
  address: string;
  /** 緯度（地圖找房用，未定位時為 null） */
  lat?: number | null;
  /** 經度（地圖找房用，未定位時為 null） */
  lng?: number | null;
  /** 樓層（例如 "5F"、"5/12"） */
  floor: string;
  /** 房型（整層住家、獨立套房、分租套房、雅房、車位） */
  roomType: string;
  /** 坪數 */
  area: number;
  /** 房屋狀態代碼 */
  status: PropertyStatus;
  /** 房屋狀態中文顯示文字（由後端依 status 產生） */
  statusText: string;
  /** 房客姓名（空置時為空字串） */
  tenantName: string;
  /** 房客電話 */
  tenantPhone?: string;
  /** 月租金（NT$） */
  monthlyRent: number;
  /** 押金（NT$） */
  deposit: number;
  /** 管理費（NT$／月，0 代表無或已含） */
  managementFee: number;
  /** 租約到期日（ISO 8601 字串） */
  leaseEndDate: string;
  /** 欠租天數（狀態為 overdue 時使用） */
  overdueDays?: number;
  /** 欠租金額（NT$，狀態為 overdue 時使用） */
  overdueAmount?: number;
  /** 維護原因（狀態為 maintenance 時使用，會同步到管家報修派工） */
  maintenanceReason?: string;
  /** 備註 */
  notes?: string;
  /** 物件特色代碼清單（對照 constants/propertyFeatures.ts 的 PROPERTY_FEATURE_MAP） */
  features?: number[];
  /** 物件特色中文名稱清單（由後端依 features 轉換，顯示用） */
  featuresText?: string[];
  /** 主圖網址（封面圖） */
  imageUrl?: string;
  /** 所有圖片網址（多圖上傳／燈箱檢視用） */
  imageUrls?: string[];
}

/**
 * 新增／編輯物件的表單參數
 * 排除由後端產生的欄位：id、roomNumber、statusText、featuresText
 */
export type PropertyAssetInput = Omit<PropertyAsset, 'id' | 'roomNumber' | 'statusText' | 'featuresText'> & {
  /** 房屋狀態代碼（必填） */
  status: PropertyStatus;
  /** 租約到期日（必填，ISO 8601 字串） */
  leaseEndDate: string;
};
