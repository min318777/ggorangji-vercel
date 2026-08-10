import { apiRequest } from './client';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ===== 마이페이지 요약 =====
export interface MyPageSummary {
  loginId: string;
  nickname: string;
  email: string;
  totalPostCount: number;
  boastCatPostCount: number;
  lostCatPostCount: number;
  totalCommentCount: number;
  registeredAt: string;
}

// ===== 내 게시글 =====
export interface MyPostDto {
  postId: number;
  postType: 'BOAST' | 'LOST';
  title: string;
  contents: string;
  view: number;
  commentCount: number;
  likeCount: number | null;
  isCompleted: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyPostListResponse {
  content: MyPostDto[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  last: boolean;
}

// ===== 내 댓글 =====
export interface MyCommentDto {
  commentId: number;
  contents: string;
  postId: number;
  postType: 'BOAST' | 'LOST';
  postTitle: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyCommentListResponse {
  content: MyCommentDto[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  last: boolean;
}

// 마이페이지 요약 조회 — GET /api/users/me
export async function getMyPageSummary(): Promise<MyPageSummary> {
  const res = await apiRequest<ApiResponse<MyPageSummary>>('/api/users/me');
  return res.data;
}

// 내가 쓴 글 조회 — GET /api/users/me/posts?type=BOAST|LOST
export async function getMyPosts(
  type: 'BOAST' | 'LOST',
  page = 0,
  size = 10
): Promise<MyPostListResponse> {
  const res = await apiRequest<ApiResponse<MyPostListResponse>>(
    `/api/users/me/posts?type=${type}&page=${page}&size=${size}`
  );
  return res.data;
}

// 내가 쓴 댓글 조회 — GET /api/users/me/comments
export async function getMyComments(
  page = 0,
  size = 10
): Promise<MyCommentListResponse> {
  const res = await apiRequest<ApiResponse<MyCommentListResponse>>(
    `/api/users/me/comments?page=${page}&size=${size}`
  );
  return res.data;
}

// 회원 탈퇴 — DELETE /api/users/me
export async function withdrawUser(): Promise<void> {
  await apiRequest('/api/users/me', { method: 'DELETE' });
}

// 내가 좋아요한 글 조회 — GET /api/users/me/liked-posts
export async function getMyLikedPosts(
  page = 0,
  size = 10
): Promise<MyPostListResponse> {
  const res = await apiRequest<ApiResponse<MyPostListResponse>>(
    `/api/users/me/liked-posts?page=${page}&size=${size}`
  );
  return res.data;
}
