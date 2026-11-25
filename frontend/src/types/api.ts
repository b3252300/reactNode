/** 後端（與 Mock）統一回應格式 */
export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T;
}

/** 分頁回應格式 */
export interface PageResult<T> {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
}

/** 分頁查詢參數 */
export interface PageParams {
    page?: number;
    pageSize?: number;
}
