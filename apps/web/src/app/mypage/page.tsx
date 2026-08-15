'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getMyPageSummary,
  getMyPosts,
  getMyComments,
  getMyLikedPosts,
  withdrawUser,
  type MyPageSummary,
  type MyPostDto,
  type MyCommentDto,
} from '@/lib/api/user';
import {
  getAdminUsers,
  updateUserStatus,
  forceWithdrawUser,
  getDau,
  type AdminUserItem,
  type DauStats,
} from '@/lib/api/admin';

// ===== 날짜 포맷 =====
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 1) return '어제';
  return formatDate(dateStr);
}

function formatJoinDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `Member since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

// ===== 페이지네이션 =====
const MAX_PAGES = 50;
const BLOCK_SIZE = 10;

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const capped = Math.min(totalPages, MAX_PAGES);
  if (capped <= 1) return null;

  const blockStart = Math.floor(currentPage / BLOCK_SIZE) * BLOCK_SIZE;
  const blockEnd = Math.min(blockStart + BLOCK_SIZE, capped);
  const pages = Array.from({ length: blockEnd - blockStart }, (_, i) => blockStart + i);

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6 flex-wrap">
      <button
        onClick={() => onPageChange(blockStart - 1)}
        disabled={blockStart === 0}
        className="px-4 py-2 rounded-full text-[13px] font-medium bg-white border border-black/10 text-charcoal hover:bg-charcoal hover:text-white hover:border-transparent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        이전
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-9 h-9 rounded-full text-[13px] font-semibold transition-all ${
            p === currentPage
              ? 'bg-charcoal text-white'
              : 'bg-white border border-black/10 text-charcoal hover:bg-charcoal hover:text-white hover:border-transparent'
          }`}
        >
          {p + 1}
        </button>
      ))}
      <button
        onClick={() => onPageChange(blockEnd)}
        disabled={blockEnd >= capped}
        className="px-4 py-2 rounded-full text-[13px] font-medium bg-white border border-black/10 text-charcoal hover:bg-charcoal hover:text-white hover:border-transparent transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        다음
      </button>
    </div>
  );
}

// ===== 사이드바 네비게이션 =====
type SidebarTab = 'profile' | 'activity' | 'settings' | 'admin';

const SIDEBAR_ITEMS: { key: SidebarTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  {
    key: 'profile',
    label: '내 프로필',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: 'activity',
    label: '활동 내역',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: '계정 설정',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    key: 'admin',
    label: '유저 관리',
    adminOnly: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

// ===== 게시글 탭 =====
type ContentTab = 'posts' | 'comments' | 'likes';

// ===== 게시글 아이템 =====
function PostItem({ post }: { post: MyPostDto }) {
  const isBoast = post.postType === 'BOAST';
  const href = isBoast ? `/boast/${post.postId}` : `/lost/${post.postId}`;

  return (
    <Link
      href={href}
      className="flex items-center justify-between px-5 py-4 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[20px] no-underline text-charcoal hover:bg-white transition-all duration-200 gap-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${
          isBoast ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {isBoast ? '일상자랑' : '실종신고'}
        </span>
        <span className="text-[15px] font-semibold truncate">{post.title}</span>
      </div>
      <span className="text-[12px] opacity-40 flex-shrink-0">{formatDate(post.createdAt)}</span>
    </Link>
  );
}

// ===== 댓글 아이템 =====
function CommentItem({ comment }: { comment: MyCommentDto }) {
  const href = comment.postType === 'BOAST'
    ? `/boast/${comment.postId}`
    : `/lost/${comment.postId}`;

  return (
    <Link href={href} className="block px-5 py-5 rounded-[24px] bg-white/50 mb-3 no-underline text-charcoal hover:bg-white transition-colors duration-200">
      <div className="text-[12px] text-brand font-semibold mb-1.5">
        RE: {comment.postTitle}
      </div>
      <p className="text-[15px] leading-relaxed mb-2">{comment.contents}</p>
      <span className="text-[12px] opacity-40">{formatRelative(comment.createdAt)}</span>
    </Link>
  );
}

// ===== 유저 관리: 유저 카드 =====
const ROLE_FILTERS = [
  { value: '', label: '전체' },
  { value: 'ROLE_USER', label: '일반 사용자' },
  { value: 'ROLE_RESTRICTED', label: '제한됨' },
  { value: 'ROLE_ADMIN', label: '관리자' },
];

function UserCard({
  user,
  isActing,
  onRestrict,
  onRestore,
  onForceWithdraw,
}: {
  user: AdminUserItem;
  isActing: boolean;
  onRestrict: () => void;
  onRestore: () => void;
  onForceWithdraw: () => void;
}) {
  const isAdminUser = user.roles.includes('ROLE_ADMIN');
  const isRestricted = user.restricted;
  const isDeleted = user.delete;

  return (
    <div className="flex items-center justify-between px-5 py-4 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[20px]">
      <div className="flex items-center gap-4 min-w-0">
        {/* 이니셜 아바타 */}
        <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          isDeleted ? 'bg-gray-100 text-gray-400' :
          isRestricted ? 'bg-red-100 text-red-500' :
          isAdminUser ? 'bg-brand/20 text-brand' :
          'bg-black/10 text-charcoal'
        }`}>
          {(user.nickname || user.loginId || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-semibold truncate">{user.nickname || user.loginId}</span>
            <span className="text-[12px] opacity-40">{user.loginId}</span>
            {/* 역할 뱃지 */}
            {isDeleted ? (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold">탈퇴</span>
            ) : isRestricted ? (
              <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-bold">제한됨</span>
            ) : isAdminUser ? (
              <span className="px-2 py-0.5 bg-brand/10 text-brand rounded-full text-[10px] font-bold">관리자</span>
            ) : (
              <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold">일반</span>
            )}
          </div>
          <span className="text-[12px] opacity-40">{formatDate(user.registeredAt)}</span>
        </div>
      </div>

      {/* 액션 버튼 — 탈퇴자·관리자는 표시 안 함 */}
      {!isDeleted && !isAdminUser && (
        <div className="flex gap-2 flex-shrink-0 ml-3">
          {isRestricted ? (
            <button
              onClick={onRestore}
              disabled={isActing}
              className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-[12px] font-semibold border-none cursor-pointer hover:bg-green-100 transition-colors disabled:opacity-40"
            >
              {isActing ? '처리 중' : '복원'}
            </button>
          ) : (
            <button
              onClick={onRestrict}
              disabled={isActing}
              className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[12px] font-semibold border-none cursor-pointer hover:bg-orange-100 transition-colors disabled:opacity-40"
            >
              {isActing ? '처리 중' : '제한'}
            </button>
          )}
          <button
            onClick={onForceWithdraw}
            disabled={isActing}
            className="px-3 py-1.5 bg-red-500 text-white rounded-full text-[12px] font-semibold border-none cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-40"
          >
            {isActing ? '처리 중' : '강제탈퇴'}
          </button>
        </div>
      )}
    </div>
  );
}

// ===== 유저 관리 패널 =====
function AdminPanel() {
  const [roleFilter, setRoleFilter] = useState('');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadUsers = useCallback(async (page: number, role: string) => {
    setIsLoading(true);
    try {
      const res = await getAdminUsers(role || undefined, page, 10);
      setUsers(res.content);
      setCurrentPage(res.number);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch { /* 조용히 실패 */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    setCurrentPage(0);
    loadUsers(0, roleFilter);
  }, [roleFilter, loadUsers]);

  const handlePageChange = (page: number) => {
    loadUsers(page, roleFilter);
  };

  const handleRestrict = async (userId: number) => {
    if (!confirm('이 사용자의 권한을 제한하겠습니까?\n게시글 조회만 가능하고 작성·댓글이 즉시 차단됩니다.')) return;
    setActionLoading(userId);
    try {
      await updateUserStatus(userId, 'RESTRICTED');
      setUsers([]);
      await loadUsers(0, roleFilter);
    } catch { alert('처리에 실패했습니다. 다시 시도해 주세요.'); }
    finally { setActionLoading(null); }
  };

  const handleRestore = async (userId: number) => {
    if (!confirm('이 사용자를 일반 사용자로 복원하겠습니까?')) return;
    setActionLoading(userId);
    try {
      await updateUserStatus(userId, 'ACTIVE');
      setUsers([]);
      await loadUsers(0, roleFilter);
    } catch { alert('처리에 실패했습니다. 다시 시도해 주세요.'); }
    finally { setActionLoading(null); }
  };

  const handleForceWithdraw = async (userId: number, loginId: string) => {
    if (!confirm(`[${loginId}] 사용자를 강제 탈퇴시키겠습니까?\n\n개인정보가 비식별화되고 모든 기기에서 즉시 로그아웃됩니다.\n이 작업은 되돌릴 수 없습니다.`)) return;
    setActionLoading(userId);
    try {
      await forceWithdrawUser(userId);
      setUsers([]);
      await loadUsers(0, roleFilter);
    } catch { alert('처리에 실패했습니다. 다시 시도해 주세요.'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="bg-white rounded-[32px] p-8 border border-black/[0.03]">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[18px] font-semibold">유저 관리</h3>
        <span className="text-[13px] opacity-40">총 {totalElements.toLocaleString()}명</span>
      </div>

      {/* 역할 필터 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {ROLE_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setRoleFilter(value)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold border-none cursor-pointer transition-all ${
              roleFilter === value
                ? 'bg-charcoal text-white'
                : 'bg-black/[0.05] text-charcoal hover:bg-black/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 유저 목록 */}
      {isLoading && users.length === 0 ? (
        <div className="py-16 text-center opacity-30">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center opacity-30 text-[14px]">해당하는 유저가 없습니다.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => (
            <UserCard
              key={user.userId}
              user={user}
              isActing={actionLoading === user.userId}
              onRestrict={() => handleRestrict(user.userId)}
              onRestore={() => handleRestore(user.userId)}
              onForceWithdraw={() => handleForceWithdraw(user.userId, user.loginId)}
            />
          ))}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

// ===== 계정 설정 패널 =====
function SettingsPanel({ summary }: { summary: MyPageSummary }) {
  const [nickname, setNickname] = useState(summary.nickname ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setIsSaving(true);
    setMessage('');
    try {
      const { apiRequest } = await import('@/lib/api/client');
      await apiRequest('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      setMessage('닉네임이 변경되었습니다.');
    } catch {
      setMessage('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-8 border border-black/[0.03]">
      <h3 className="text-[18px] font-semibold mb-6">계정 설정</h3>
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div>
          <label className="block text-[13px] font-semibold mb-2 opacity-60">로그인 ID</label>
          <input
            type="text"
            value={summary.loginId}
            disabled
            className="w-full px-5 py-3 bg-black/5 rounded-[16px] text-[14px] opacity-50 cursor-not-allowed outline-none"
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold mb-2">닉네임</label>
          <input
            type="text"
            value={nickname}
            readOnly
            disabled
            className="w-full px-5 py-3 bg-black/[0.03] border border-black/[0.06] rounded-[16px] text-[14px] outline-none text-black/40 cursor-not-allowed"
          />
        </div>
        {message && (
          <p className={`text-[13px] ${message.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={isSaving || !nickname.trim()}
          className="h-[54px] bg-charcoal text-white rounded-full font-semibold text-[15px] hover:bg-brand transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed border-none cursor-pointer"
        >
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
      </form>
    </div>
  );
}

// ===== 메인 페이지 =====
export default function MyPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<MyPageSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dau, setDau] = useState<DauStats | null>(null);

  // 사이드바 + 콘텐츠 탭
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('profile');
  const [contentTab, setContentTab] = useState<ContentTab>('posts');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // 게시글 목록 (BOAST + LOST 합산)
  const [posts, setPosts] = useState<MyPostDto[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsCurrentPage, setPostsCurrentPage] = useState(0);
  const [postsTotalPages, setPostsTotalPages] = useState(0);

  // 댓글 목록
  const [comments, setComments] = useState<MyCommentDto[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsCurrentPage, setCommentsCurrentPage] = useState(0);
  const [commentsTotalPages, setCommentsTotalPages] = useState(0);

  // 좋아요한 글 목록
  const [likedPosts, setLikedPosts] = useState<MyPostDto[]>([]);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  const [likesCurrentPage, setLikesCurrentPage] = useState(0);
  const [likesTotalPages, setLikesTotalPages] = useState(0);

  const handleWithdraw = async () => {
    if (!confirm('정말로 탈퇴하시겠습니까?\n\n탈퇴하면 모든 개인정보가 비식별화되며 복구가 불가능합니다.')) return;
    setIsWithdrawing(true);
    try {
      await withdrawUser();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('role');
      router.replace('/login');
    } catch {
      alert('탈퇴 처리에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // 로그인 체크 + 관리자 여부 확인
  useEffect(() => {
    if (!localStorage.getItem('accessToken')) {
      router.replace('/login');
      return;
    }
    const admin = localStorage.getItem('role') === 'ROLE_ADMIN';
    setIsAdmin(admin);
    if (admin) getDau().then(setDau).catch(() => {});
  }, [router]);

  // 요약 조회
  useEffect(() => {
    getMyPageSummary()
      .then(setSummary)
      .catch(() => router.replace('/login'))
      .finally(() => setIsLoadingSummary(false));
  }, [router]);

  // 게시글 로드 (BOAST + LOST 병렬 조회 후 날짜순 정렬)
  const loadPosts = useCallback(async (page: number) => {
    setIsLoadingPosts(true);
    try {
      const [boastRes, lostRes] = await Promise.all([
        getMyPosts('BOAST', page, 5),
        getMyPosts('LOST', page, 5),
      ]);
      const merged = [...boastRes.content, ...lostRes.content].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPosts(merged);
      setPostsCurrentPage(page);
      setPostsTotalPages(Math.max(boastRes.totalPages, lostRes.totalPages));
    } catch { /* 조용히 실패 */ }
    finally { setIsLoadingPosts(false); }
  }, []);

  // 댓글 로드
  const loadComments = useCallback(async (page: number) => {
    setIsLoadingComments(true);
    try {
      const res = await getMyComments(page, 10);
      setComments(res.content);
      setCommentsCurrentPage(page);
      setCommentsTotalPages(res.totalPages);
    } catch { /* 조용히 실패 */ }
    finally { setIsLoadingComments(false); }
  }, []);

  // 좋아요한 글 로드
  const loadLikes = useCallback(async (page: number) => {
    setIsLoadingLikes(true);
    try {
      const res = await getMyLikedPosts(page, 10);
      setLikedPosts(res.content);
      setLikesCurrentPage(page);
      setLikesTotalPages(res.totalPages);
    } catch { /* 조용히 실패 */ }
    finally { setIsLoadingLikes(false); }
  }, []);

  // 탭 전환 시 데이터 초기 로드
  useEffect(() => {
    if (sidebarTab !== 'activity') return;
    if (contentTab === 'posts') loadPosts(0);
    else if (contentTab === 'comments') loadComments(0);
    else if (contentTab === 'likes') loadLikes(0);
  }, [sidebarTab, contentTab, loadPosts, loadComments, loadLikes]);

  if (isLoadingSummary) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10">
          <div className="flex items-center justify-center py-40">
            <svg className="animate-spin w-8 h-8 text-brand" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="min-h-screen bg-white">

      <div className="max-w-[1440px] mx-auto px-5 md:px-10">

        {/* ===== 2단 레이아웃: 사이드바 + 메인 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 pt-[60px] pb-[120px]">

          {/* ===== 사이드바 ===== */}
          <aside className="flex flex-col gap-2">
            {SIDEBAR_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
              <button
                key={item.key}
                onClick={() => setSidebarTab(item.key)}
                className={`
                  flex items-center gap-3 px-6 py-4 rounded-[20px] text-[15px] font-medium
                  text-left w-full border-none cursor-pointer transition-all duration-200
                  ${sidebarTab === item.key
                    ? 'bg-white text-brand shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
                    : 'bg-transparent text-charcoal hover:bg-black/[0.03]'
                  }
                `}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </aside>

          {/* ===== 메인 콘텐츠 ===== */}
          <main>
            {/* ===== 프로필 카드 ===== */}
            <section className="bg-white rounded-[40px] px-10 py-10 border border-black/[0.03] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-6">
                {/* 이니셜 아바타 */}
                <div className="w-20 h-20 rounded-[30px] bg-brand/20 flex items-center justify-center text-brand font-bold text-[32px] flex-shrink-0">
                  {(summary.nickname || summary.loginId || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-[24px] font-semibold mb-1">{summary.nickname || summary.loginId}</h2>
                  <span className="text-[12px] text-brand font-semibold uppercase tracking-[0.05em]">
                    {formatJoinDate(summary.registeredAt)}
                  </span>
                </div>
              </div>
              {/* 통계 */}
              <div className="flex gap-12 pr-5">
                <div className="text-center">
                  <span className="block text-[24px] font-bold">{summary.totalPostCount}</span>
                  <span className="text-[12px] opacity-40 font-semibold tracking-wide">POSTS</span>
                </div>
                <div className="text-center">
                  <span className="block text-[24px] font-bold">{summary.totalCommentCount}</span>
                  <span className="text-[12px] opacity-40 font-semibold tracking-wide">COMMENTS</span>
                </div>
                {isAdmin && (
                  <>
                    <div className="text-center">
                      <span className="block text-[24px] font-bold text-brand">
                        {dau?.loginUserCount ?? '—'}
                      </span>
                      <span className="text-[12px] opacity-40 font-semibold tracking-wide">TODAY DAU</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[24px] font-bold text-brand">
                        {dau?.totalVisitorCount ?? '—'}
                      </span>
                      <span className="text-[12px] opacity-40 font-semibold tracking-wide">VISITORS</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ===== 내 프로필 탭 ===== */}
            {sidebarTab === 'profile' && (
              <div className="bg-white rounded-[32px] p-8 border border-black/[0.03]">
                <h3 className="text-[18px] font-semibold mb-6">기본 정보</h3>
                <div className="flex flex-col gap-4">
                  {[
                    { label: '로그인 ID', value: summary.loginId },
                    { label: '닉네임', value: summary.nickname },
                    { label: '자랑글', value: `${summary.boastCatPostCount}개` },
                    { label: '실종글', value: `${summary.lostCatPostCount}개` },
                    { label: '댓글', value: `${summary.totalCommentCount}개` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-3 border-b border-black/[0.04] last:border-none">
                      <span className="text-[14px] opacity-50 font-medium">{label}</span>
                      <span className="text-[14px] font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
                {/* 회원 탈퇴 */}
                <div className="mt-6 pt-6 border-t border-black/[0.04]">
                  <button
                    onClick={handleWithdraw}
                    disabled={isWithdrawing}
                    className="text-[13px] text-red-400 hover:text-red-600 transition-colors font-medium bg-transparent border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isWithdrawing ? '처리 중...' : '회원 탈퇴'}
                  </button>
                </div>
              </div>
            )}

            {/* ===== 활동 내역 탭 ===== */}
            {sidebarTab === 'activity' && (
              <>
                {/* 콘텐츠 탭 */}
                <div className="flex gap-8 border-b border-black/5 mb-8 pb-1">
                  {(['posts', 'comments', 'likes'] as ContentTab[]).map((tab) => {
                    const LABELS: Record<ContentTab, string> = {
                      posts: '내가 쓴 글',
                      comments: '내가 쓴 댓글',
                      likes: '좋아요한 글',
                    };
                    return (
                      <button
                        key={tab}
                        onClick={() => {
                          setContentTab(tab);
                          if (tab === 'posts') { setPosts([]); setPostsCurrentPage(0); loadPosts(0); }
                          else if (tab === 'comments') { setComments([]); setCommentsCurrentPage(0); loadComments(0); }
                          else { setLikedPosts([]); setLikesCurrentPage(0); loadLikes(0); }
                        }}
                        className={`bg-transparent border-none font-[inherit] text-[16px] font-semibold text-charcoal pb-4 cursor-pointer relative transition-opacity duration-300 ${
                          contentTab === tab ? 'opacity-100' : 'opacity-40'
                        }`}
                      >
                        {LABELS[tab]}
                        {contentTab === tab && (
                          <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-charcoal rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* 게시글 목록 */}
                {contentTab === 'posts' && (
                  <div className="flex flex-col gap-2">
                    {isLoadingPosts ? (
                      <div className="py-16 text-center opacity-30">불러오는 중...</div>
                    ) : posts.length === 0 ? (
                      <div className="py-16 text-center opacity-30 text-[14px]">작성한 게시글이 없습니다.</div>
                    ) : (
                      <>
                        {posts.map((post) => <PostItem key={`${post.postType}-${post.postId}`} post={post} />)}
                        <Pagination
                          currentPage={postsCurrentPage}
                          totalPages={postsTotalPages}
                          onPageChange={(p) => { window.scrollTo({ top: 0, behavior: 'smooth' }); loadPosts(p); }}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* 댓글 목록 */}
                {contentTab === 'comments' && (
                  <div className="flex flex-col gap-2">
                    {isLoadingComments ? (
                      <div className="py-16 text-center opacity-30">불러오는 중...</div>
                    ) : comments.length === 0 ? (
                      <div className="py-16 text-center opacity-30 text-[14px]">작성한 댓글이 없습니다.</div>
                    ) : (
                      <>
                        {comments.map((c) => <CommentItem key={c.commentId} comment={c} />)}
                        <Pagination
                          currentPage={commentsCurrentPage}
                          totalPages={commentsTotalPages}
                          onPageChange={(p) => { window.scrollTo({ top: 0, behavior: 'smooth' }); loadComments(p); }}
                        />
                      </>
                    )}
                  </div>
                )}

                {/* 좋아요한 글 목록 */}
                {contentTab === 'likes' && (
                  <div className="flex flex-col gap-2">
                    {isLoadingLikes ? (
                      <div className="py-16 text-center opacity-30">불러오는 중...</div>
                    ) : likedPosts.length === 0 ? (
                      <div className="py-16 text-center opacity-30 text-[14px]">좋아요한 글이 없습니다.</div>
                    ) : (
                      <>
                        {likedPosts.map((post) => (
                          <PostItem key={`BOAST-${post.postId}`} post={post} />
                        ))}
                        <Pagination
                          currentPage={likesCurrentPage}
                          totalPages={likesTotalPages}
                          onPageChange={(p) => { window.scrollTo({ top: 0, behavior: 'smooth' }); loadLikes(p); }}
                        />
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ===== 계정 설정 탭 ===== */}
            {sidebarTab === 'settings' && <SettingsPanel summary={summary} />}

            {/* ===== 유저 관리 탭 (관리자 전용) ===== */}
            {sidebarTab === 'admin' && isAdmin && <AdminPanel />}
          </main>
        </div>

      </div>

      <div className="fixed bottom-10 right-10 text-[10px] font-mono opacity-40 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        SPRING_BOOT_CONNECTED // USER_AUTH_ACTIVE
      </div>
    </div>
  );
}
