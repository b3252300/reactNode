/** 登入請求參數 */
export interface LoginParams {
    /** 登入帳號 */
    username: string;
    /** 登入密碼（明文送出，需搭配 HTTPS） */
    password: string;
}

/** 登入成功回傳結果 */
export interface LoginResult {
    /** 存取權杖（JWT），後續請求放在 Authorization 標頭 */
    token: string;
    /** 有效秒數 */
    expiresIn: number;
}

/** 使用者權限資訊 */
export interface PermissionInfo {
    /** 角色清單，例如 ['admin']，用於頁面／路由層級的權限判斷 */
    roles: string[];
    /** 權限碼，例如 'user:create'，用於按鈕／操作層級的權限判斷 */
    permissions: string[];
}
