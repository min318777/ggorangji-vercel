import { apiRequest } from './client';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ===== 관리자 유저 목록 =====
export interface AdminUserItem {
  userId: number;
  loginId: string;
  nickname: string;
  roles: string[];
  restricted: boolean;  // Java: boolean isRestricted → Jackson 직렬화 → "restricted"
  delete: boolean;      // Java: boolean isDelete → Jackson 직렬화 → "delete"
  registeredAt: string;
}

// Spring Data Page<T> 기본 직렬화 구조
export interface AdminUserPage {
  content: AdminUserItem[];
  totalElements: number;
  totalPages: number;
  number: number; // 현재 페이지 (0-indexed)
  size: number;
}

// 유저 목록 조회 — GET /api/admin/users
export async function getAdminUsers(
  roleName?: string,
  page = 0,
  size = 20
): Promise<AdminUserPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (roleName) params.set('roleName', roleName);
  const res = await apiRequest<ApiResponse<AdminUserPage>>(`/api/admin/users?${params}`);
  return res.data!;
}

// 사용자 상태 변경 — PATCH /api/admin/users/{userId}/status
// status: 'RESTRICTED' (제한) | 'ACTIVE' (복원)
export async function updateUserStatus(userId: number, status: 'RESTRICTED' | 'ACTIVE'): Promise<void> {
  await apiRequest(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// 강제 탈퇴 — DELETE /api/admin/users/{userId}
export async function forceWithdrawUser(userId: number): Promise<void> {
  await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
}

export interface DauStats {
  loginUserCount: number;
  totalVisitorCount: number;
}

// DAU 조회 — GET /api/admin/stats/dau
export async function getDau(date?: string): Promise<DauStats> {
  const url = date ? `/api/admin/stats/dau?date=${date}` : '/api/admin/stats/dau';
  const res = await apiRequest<ApiResponse<DauStats>>(url);
  return res.data ?? { loginUserCount: 0, totalVisitorCount: 0 };
}
