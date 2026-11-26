/** 後端（與 Mock）統一回應格式 */
export interface ApiResponse<T = unknown> {
    /** 業務狀態碼（例如 200 表示成功，其他值代表各種錯誤） */
    code: number;
    /** 回應訊息（成功提示或錯誤原因，可直接顯示給使用者） */
    message: string;
    /** 實際回傳的資料內容，型別由泛型 T 決定 */
    data: T;
}

/** 分頁回應格式 */
export interface PageResult<T> {
    /** 當前頁的資料列表 */
    list: T[];
    /** 符合條件的資料總筆數（用於計算總頁數） */
    total: number;
    /** 目前頁碼（從 1 開始） */
    page: number;
    /** 每頁顯示筆數 */
    pageSize: number;
}

/** 分頁查詢參數 */
export interface PageParams {
    /** 要查詢的頁碼（從 1 開始，未填使用後端預設值） */
    page?: number;
    /** 每頁筆數（未填使用後端預設值） */
    pageSize?: number;
}
