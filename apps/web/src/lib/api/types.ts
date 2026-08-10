// ===== 로그인 =====
export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  userId: number;
  role: string;
}

// ===== 회원가입 =====
export interface JoinRequest {
  loginId: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
}

// ===== 공통 API 응답 래퍼 =====
export interface ApiResponse<T = void> {
  status: number;
  success: boolean;
  errorCode?: string | null; // 실패 시 ErrorCode enum 이름 (예: "NOT_FOUND_POST"), 성공 시 null
  message?: string;
  data?: T;
}

// ===== 에러 응답 =====
export interface ApiErrorResponse {
  status: number;
  success: false;
  errorCode: string;  // 서버 ErrorCode enum 이름 — 프론트 분기에 사용
  message: string;
  data?: unknown;
}
