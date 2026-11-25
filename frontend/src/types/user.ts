import type { PageParams } from './api';

export type UserRole = 'admin' | 'editor' | 'viewer';
export type UserStatus = 'active' | 'disabled';

export interface UserInfo {
    id: number;
    name: string;
    email: string;
    phone: string;
    avatar: string;
    role: UserRole;
    status: UserStatus;
    createdAt: string;
}

export interface UserListParams extends PageParams {
    keyword?: string;
}
