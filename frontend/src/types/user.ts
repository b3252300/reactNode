import type { PageParams } from './api';

/**
 * 使用者角色
 * - admin：管理員（完整權限）
 * - editor：編輯者（可新增／修改資料）
 * - viewer：檢視者（僅可瀏覽）
 */
export type UserRole = 'admin' | 'editor' | 'viewer';

/**
 * 帳號狀態
 * - active：啟用
 * - disabled：停用（無法登入）
 */
export type UserStatus = 'active' | 'disabled';

/** 使用者（會員）資訊 */
export interface UserInfo {
    /** 使用者唯一識別碼 */
    id: number;
    /** 使用者名稱／顯示名稱 */
    name: string;
    /** 電子郵件 */
    email: string;
    /** 手機號碼 */
    phone: string;
    /** 大頭貼圖片網址 */
    avatar: string;
    /** 使用者角色 */
    role: UserRole;
    /** 帳號狀態 */
    status: UserStatus;
    /** 帳號建立時間（ISO 8601 字串） */
    createdAt: string;
}

/** 會員清單查詢參數（含分頁） */
export interface UserListParams extends PageParams {
    /** 搜尋關鍵字（比對姓名、Email 等） */
    keyword?: string;
}
