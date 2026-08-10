'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Logo from './Logo';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  type NotificationItem,
  type NotificationType,
} from '@/lib/api/notification';
import { logout } from '@/lib/api/auth';
import { getMyPageSummary } from '@/lib/api/user';
import { useNotificationSSE } from '@/hooks/useNotificationSSE';

// ===== 상대 시간 포맷 유틸 =====
function formatRelativeTime(dateStr: string): string {
  // 서버가 UTC LocalDateTime을 timezone 없이 내려주므로 'Z' 추가해 UTC로 해석
  const utcStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
  const diff = Date.now() - new Date(utcStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 1) return '어제';
  return `${days}일 전`;
}

// ===== 알림 타입별 아이콘 =====
function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === 'LIKE') {
    return (
      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#E8833A" stroke="#E8833A" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </div>
  );
}

// ===== 알림 드롭다운 =====
interface NotificationDropdownProps {
  notifications: NotificationItem[];
  isLoading: boolean;
  onReadOne: (noti: NotificationItem) => void;
  onReadAll: () => void;
  onDismiss: (id: number) => void;
}

function NotificationDropdown({ notifications, isLoading, onReadOne, onReadAll, onDismiss }: NotificationDropdownProps) {
  const [visibleCount, setVisibleCount] = useState(5);
  const visible = notifications.slice(0, visibleCount);
  const hasMore = notifications.length > visibleCount;

  return (
    <div className="absolute top-[calc(100%+12px)] right-0 w-[360px] bg-white/95 backdrop-blur-xl border border-white/60 rounded-[24px] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.1)] z-[200]">
      {/* 드롭다운 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-[14px] font-semibold">알림</span>
        <button
          onClick={onReadAll}
          className="text-[11px] text-brand bg-transparent border-none cursor-pointer font-medium hover:opacity-70 transition-opacity"
        >
          전체 읽음
        </button>
      </div>

      {/* 알림 목록 */}
      <div className="flex flex-col gap-1 max-h-[320px] overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-[13px] opacity-50">불러오는 중...</div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-[13px] opacity-50">알림이 없습니다.</div>
        ) : (
          visible.map((noti) => (
            <div
              key={noti.id}
              onClick={() => onReadOne(noti)}
              className={`flex gap-3 p-3 rounded-2xl cursor-pointer transition-colors duration-200 hover:bg-black/5 ${noti.isRead ? 'opacity-50' : ''}`}
            >
              <NotificationIcon type={noti.type} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] leading-[1.4] mb-1 break-words">{noti.message}</p>
                <span className="text-[11px] text-gray-400">{formatRelativeTime(noti.createdAt)}</span>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {/* 미읽음 점 */}
                {!noti.isRead && (
                  <div className="w-1.5 h-1.5 bg-brand rounded-full mt-1.5" />
                )}
                {/* X 버튼 */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss(noti.id); }}
                  className="text-[11px] text-gray-400 hover:text-gray-700 bg-transparent border-none cursor-pointer leading-none p-0"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 더보기 버튼 */}
      {hasMore && (
        <div className="mt-3 pt-3 border-t border-black/5 text-center">
          <button
            onClick={() => setVisibleCount(10)}
            className="text-[12px] text-gray-500 bg-transparent border-none cursor-pointer hover:text-charcoal transition-colors"
          >
            더보기
          </button>
        </div>
      )}
    </div>
  );
}

// ===== 프로필 드롭다운 =====
interface ProfileDropdownProps {
  loginId: string;
  onLogout: () => void;
}

function ProfileDropdown({ loginId, onLogout }: ProfileDropdownProps) {
  return (
    <div className="absolute top-[calc(100%+8px)] right-0 w-[180px] bg-white/95 backdrop-blur-xl border border-white/60 rounded-[20px] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.1)] z-[200]">
      {/* 사용자 아이디 표시 */}
      <div className="px-3 py-2 text-[12px] font-semibold text-charcoal/60 border-b border-black/5 mb-1">
        {loginId}
      </div>
      <Link
        href="/mypage"
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium text-charcoal no-underline hover:bg-black/5 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        마이페이지
      </Link>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors text-left bg-transparent border-none cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        로그아웃
      </button>
    </div>
  );
}

// ===== 메인 헤더 컴포넌트 =====
export default function Header() {
  const router = useRouter();

  const pathname = usePathname();

  // 로그인 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [nickname, setNickname] = useState('');

  // 드롭다운 상태 ('notification' | 'profile' | null)
  const [activeDropdown, setActiveDropdown] = useState<'notification' | 'profile' | null>(null);

  // 알림 데이터
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotis, setIsLoadingNotis] = useState(false);
  const [notisLoaded, setNotisLoaded] = useState(false);

  // 외부 클릭 감지용 ref
  const authSectionRef = useRef<HTMLDivElement>(null);

  // 미읽음 알림 수
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // 마운트 시 로그인 상태 확인
  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem('accessToken');
      const id = localStorage.getItem('loginId') ?? '';
      const cached = localStorage.getItem('nickname') ?? '';
      setIsLoggedIn(!!token);
      setLoginId(id);
      setNickname(cached);
    };

    syncAuth();

    // 다른 탭에서 로그인/로그아웃 시 동기화
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  // 닉네임 캐시 없으면 API에서 조회
  useEffect(() => {
    if (!isLoggedIn || nickname) return;
    getMyPageSummary()
      .then((data) => {
        setNickname(data.nickname);
        localStorage.setItem('nickname', data.nickname);
      })
      .catch(() => {});
  }, [isLoggedIn, nickname]);

  // 로그인 시 알림 자동 로드 / 로그아웃 시 초기화
  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setNotisLoaded(false);
      return;
    }
    getNotifications(0, 10)
      .then((data) => {
        setNotifications(data.content.filter((n) => !n.isRead));
        setNotisLoaded(true);
      })
      .catch(() => {});
  }, [isLoggedIn]);

  // SSE 연결 — 로그인 상태일 때 실시간 알림 수신
  useNotificationSSE({
    isLoggedIn,
    onNotification: (noti) => {
      setNotifications((prev) => [noti, ...prev]);
    },
  });

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (authSectionRef.current && !authSectionRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 드롭다운 토글
  const toggleDropdown = useCallback(
    (name: 'notification' | 'profile') => {
      setActiveDropdown((prev) => (prev === name ? null : name));
    },
    []
  );

  // 알림 벨 클릭 — 드롭다운 열리면 목록 로드
  const handleBellClick = useCallback(async () => {
    const next = activeDropdown !== 'notification';
    setActiveDropdown(next ? 'notification' : null);

    if (next && !notisLoaded) {
      setIsLoadingNotis(true);
      try {
        const data = await getNotifications(0, 10);
        setNotifications(data.content.filter((n) => !n.isRead));
        setNotisLoaded(true);
      } catch {
        /* 조용히 실패 */
      } finally {
        setIsLoadingNotis(false);
      }
    }
  }, [activeDropdown, notisLoaded]);

  // 단일 알림 읽음 + 게시글 이동
  const handleReadOne = useCallback(async (noti: NotificationItem) => {
    try {
      await markAsRead(noti.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === noti.id ? { ...n, isRead: true } : n))
      );
    } catch {
      /* 조용히 실패 */
    }
    const path = noti.postType === 'BOAST'
      ? `/boast/${noti.postId}`
      : `/lost/${noti.postId}`;
    setActiveDropdown(null);
    router.push(path);
  }, [router]);

  // 알림 읽음 처리 후 목록에서 제거
  const handleDismiss = useCallback(async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await markAsRead(id);
    } catch {
      /* 조용히 실패 */
    }
  }, []);

  // 전체 읽음
  const handleReadAll = useCallback(async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* 조용히 실패 */
    }
  }, []);

  // 로그아웃
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      /* 조용히 실패 */
    }
    setIsLoggedIn(false);
    setLoginId('');
    setNickname('');
    setNotifications([]);
    setNotisLoaded(false);
    setActiveDropdown(null);
    router.push('/');
  }, [router]);

  const navActive = 'bg-[#111111] text-white rounded-full w-[125.18px] h-[40.31px] flex items-center justify-center text-[13px] font-medium no-underline';
  const navInactive = 'text-gray-500 text-[13px] font-medium w-[125.18px] h-[40.31px] flex items-center justify-center no-underline hover:text-gray-900 transition-colors duration-150';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-[1440px] mx-auto px-5 md:px-10 h-[64px] flex items-center justify-between">
        <Logo />

        {/* 네비게이션 — 활성 항목만 다크 pill */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/boast" className={pathname.startsWith('/boast') ? navActive : navInactive}><span className="w-[72.2px] h-[25px] flex items-center justify-center">일상공유</span></Link>
          <Link href="/lost"  className={pathname.startsWith('/lost')  ? navActive : navInactive}><span className="w-[72.2px] h-[25px] flex items-center justify-center">실종신고</span></Link>
          <Link href="/about"  className={pathname === '/about' ? navActive : navInactive}><span className="w-[72.2px] h-[25px] flex items-center justify-center">소개</span></Link>
        </nav>

        {/* ===== 비로그인 상태 ===== */}
        {!isLoggedIn && (
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors no-underline hidden sm:block">
              로그인
            </Link>
            <Link
              href="/join"
              className="flex items-center gap-2 text-[13px] font-semibold bg-[#111111] text-white px-5 py-2 rounded-full no-underline hover:bg-gray-800 transition-colors duration-200"
            >
              회원가입
            </Link>
          </div>
        )}

        {/* ===== 로그인 상태 ===== */}
        {isLoggedIn && (
          <div className="flex items-center gap-3" ref={authSectionRef}>

            {/* 알림 벨 */}
            <div className="relative">
              <button
                onClick={handleBellClick}
                className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors bg-transparent border-none cursor-pointer text-gray-600"
                aria-label="알림"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full" />
                )}
              </button>
              {activeDropdown === 'notification' && (
                <NotificationDropdown
                  notifications={notifications}
                  isLoading={isLoadingNotis}
                  onReadOne={handleReadOne}
                  onReadAll={handleReadAll}
                  onDismiss={handleDismiss}
                />
              )}
            </div>

            {/* 프로필 */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('profile')}
                className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity bg-transparent border-none"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 select-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <span className="text-[13px] font-medium hidden sm:block text-gray-700">
                  {nickname || loginId}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`text-gray-400 transition-transform duration-200 ${activeDropdown === 'profile' ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {activeDropdown === 'profile' && (
                <ProfileDropdown loginId={loginId} onLogout={handleLogout} />
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
