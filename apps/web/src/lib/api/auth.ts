import { apiRequest, ApiError, BASE_URL } from './client';
import type { LoginRequest, LoginResponse, JoinRequest } from './types';

// 로그인 — POST /api/users/login (JSON 바디)
// 응답: {success, accessToken, userId, role}
// 서버는 refresh 토큰을 httpOnly 쿠키로 설정
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include', // refresh 쿠키 수신
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: '로그인에 실패했습니다.', errorCode: 'UNKNOWN_ERROR' }));
    // ApiError로 통일 — errorCode로 프론트에서 정확한 분기 가능
    // 예: error.errorCode === 'UNAUTHORIZED' → "아이디 또는 비밀번호를 확인하세요"
    throw new ApiError(
      error.message ?? '로그인에 실패했습니다.',
      response.status,
      error.errorCode ?? 'UNKNOWN_ERROR'
    );
  }

  const result: LoginResponse = await response.json();

  // 액세스 토큰 및 사용자 정보를 로컬 스토리지에 저장
  if (typeof window !== 'undefined' && result.accessToken) {
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('userId', String(result.userId));
    localStorage.setItem('role', result.role);
    // 헤더 표시용으로 loginId도 저장 (서버 응답에 없으므로 요청값 그대로 저장)
    localStorage.setItem('loginId', data.loginId);
    // storage 이벤트는 같은 탭에서 자동 발화하지 않으므로 수동 dispatch → 헤더 syncAuth 트리거
    window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken' }));
  }

  return result;
}

// 아이디 중복 확인 — GET /api/users/check-id?loginId=abc
export async function checkLoginId(loginId: string): Promise<boolean> {
  const result = await apiRequest<{ data: boolean }>(`/api/users/check-id?loginId=${encodeURIComponent(loginId)}`);
  return result.data; // true: 사용 가능, false: 중복
}

// 닉네임 중복 확인 — GET /api/users/check-nickname?nickname=홍길동
export async function checkNickname(nickname: string): Promise<boolean> {
  const result = await apiRequest<{ data: boolean }>(`/api/users/check-nickname?nickname=${encodeURIComponent(nickname)}`);
  return result.data; // true: 사용 가능, false: 중복
}

// 회원가입 — POST /api/users/join (JSON 바디)
export async function join(data: JoinRequest): Promise<void> {
  await apiRequest<void>('/api/users/join', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// 로그아웃 — POST /api/logout
export async function logout(): Promise<void> {
  await apiRequest<void>('/api/logout', { method: 'POST' });

  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('loginId');
    localStorage.removeItem('nickname');
    // storage 이벤트는 같은 탭에서 자동 발화하지 않으므로 수동 dispatch → 헤더 syncAuth 트리거
    window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken' }));
  }
}

// 토큰 재발급 — POST /api/auth/token/refresh (refresh 쿠키 자동 전송)
export async function reissueToken(): Promise<{ accessToken: string }> {
  const result = await apiRequest<{ accessToken: string }>('/api/auth/token/refresh', {
    method: 'POST',
  });

  if (typeof window !== 'undefined' && result.accessToken) {
    localStorage.setItem('accessToken', result.accessToken);
  }

  return result;
}

// 현재 저장된 액세스 토큰 반환
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

// 로그인 여부 확인
export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
