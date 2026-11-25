export interface LoginParams {
    username: string;
    password: string;
}

export interface LoginResult {
    token: string;
    /** 有效秒數 */
    expiresIn: number;
}

export interface PermissionInfo {
    roles: string[];
    /** 權限碼，例如 'user:create' */
    permissions: string[];
}
