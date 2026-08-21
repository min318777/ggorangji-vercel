import { apiRequest } from './client';

// ===== 알림 타입 =====
// 백엔드 NotificationType enum과 일치 (COMMENT, LIKE)
export type NotificationType = 'COMMENT' | 'LIKE';

// 백엔드 PostType enum과 일치
export type PostType = 'BOAST' | 'LOST';

export interface NotificationItem {
  id: number;
  sourceId: number;
  postId: number;
  postType: PostType;
  type: NotificationType;
  message: string;
  receiverUserId: number;
  isRead: boolean;
  createdAt: string; // ISO 8601
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PageData<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  page: number;
}

// 알림 목록 조회 — GET /api/notifications
export async function getNotifications(page = 0, size = 10) {
  const res = await apiRequest<ApiResponse<PageData<NotificationItem>>>(
    `/api/notifications?page=${page}&size=${size}`
  );
  return res.data ?? { content: [], totalElements: 0, totalPages: 0, size, page: 0 };
}

// 단일 알림 읽음 처리 — PATCH /api/notifications/{id}/read
export async function markAsRead(id: number) {
  return apiRequest<ApiResponse<NotificationItem>>(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

// 전체 알림 읽음 처리 — PATCH /api/notifications/read-all
export async function markAllAsRead() {
  return apiRequest<ApiResponse<unknown>>('/api/notifications/read-all', {
    method: 'PATCH',
  });
}
