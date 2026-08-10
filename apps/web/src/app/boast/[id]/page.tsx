'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getBoastPost,
  getBoastComments,
  postBoastComment,
  deleteComment,
  deleteBoastPost,
  likePost,
  unlikePost,
  getLikeStatus,
  type BoastPostDetail,
  type CommentItem,
  type RegisterCommentResult,
} from '@/lib/api/posts';

// ===== 날짜 포맷 =====
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return formatDate(dateStr);
}

// ===== 풀스크린 이미지 모달 =====
function ImageModal({ imageUrls, startIndex, onClose }: { imageUrls: string[]; startIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(startIndex);
  const hasMultiple = imageUrls.length > 1;
  const goPrev = () => setCurrent((c) => (c - 1 + imageUrls.length) % imageUrls.length);
  const goNext = () => setCurrent((c) => (c + 1) % imageUrls.length);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 닫기 버튼 */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border-none cursor-pointer text-white transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* 원본 비율 이미지 */}
      <img
        src={imageUrls[current]}
        alt={`이미지 ${current + 1}`}
        className="max-w-[min(90vw,800px)] max-h-[80vh] object-contain rounded-[12px]"
        onClick={(e) => e.stopPropagation()}
      />

      {/* 카운터 */}
      {hasMultiple && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/10 text-white text-[13px] font-semibold rounded-full">
          {current + 1} / {imageUrls.length}
        </div>
      )}

      {/* 좌우 화살표 */}
      {hasMultiple && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border-none cursor-pointer text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border-none cursor-pointer text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

// ===== 갤러리 (메인 이미지 + 썸네일 그리드) =====
function Gallery({ imageUrls }: { imageUrls: string[] }) {
  const [current, setCurrent] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const THUMBNAIL_GRADIENTS = [
    'from-amber-50 to-orange-100',
    'from-stone-100 to-amber-50',
    'from-orange-50 to-rose-100',
    'from-amber-100 to-yellow-50',
  ];

  if (imageUrls.length === 0) {
    return (
      <div className="rounded-[24px] overflow-hidden mb-12 max-w-[520px]">
        <div className={`w-full aspect-square bg-gradient-to-br ${THUMBNAIL_GRADIENTS[0]} flex items-center justify-center`}>
          <svg viewBox="0 0 100 100" fill="none" className="w-20 h-20 opacity-10 text-brand">
            <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" />
            <path d="M30 65C30 50 40 40 50 40C60 40 70 50 70 65" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <circle cx="40" cy="45" r="3" fill="currentColor" />
            <circle cx="60" cy="45" r="3" fill="currentColor" />
            <path d="M25 35L35 45M75 35L65 45" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  const hasMultiple = imageUrls.length > 1;
  const goPrev = () => setCurrent((c) => (c - 1 + imageUrls.length) % imageUrls.length);
  const goNext = () => setCurrent((c) => (c + 1) % imageUrls.length);

  return (
    <div className="mb-12 max-w-[520px]">
      {/* 메인 이미지 — 클릭하면 풀스크린 모달 */}
      <div className="relative rounded-[24px] overflow-hidden bg-[#F8F6F4] aspect-square">
        <img
          src={imageUrls[current]}
          alt={`이미지 ${current + 1}`}
          className="w-full h-full object-cover block cursor-zoom-in"
          onClick={() => setModalOpen(true)}
        />

        {hasMultiple && (
          <>
            <button type="button" onClick={goPrev} aria-label="이전 이미지"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors border-none cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button type="button" onClick={goNext} aria-label="다음 이미지"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors border-none cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/55 text-white text-[12px] font-semibold rounded-full">
              {current + 1} / {imageUrls.length}
            </div>
          </>
        )}

        {/* 확대 힌트 아이콘 */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center pointer-events-none">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </div>
      </div>

      {/* 썸네일 스트립 */}
      {hasMultiple && (
        <div className="grid grid-cols-4 gap-2 mt-3">
          {imageUrls.map((url, i) => (
            <button key={i} type="button" onClick={() => setCurrent(i)}
              className={`relative aspect-square overflow-hidden rounded-[12px] cursor-pointer transition-all duration-200 border-none p-0 ${
                i === current ? 'ring-2 ring-brand ring-offset-2' : 'opacity-70 hover:opacity-100'
              }`}>
              <img src={url} alt={`썸네일 ${i + 1}`} className="w-full h-full object-cover block" />
            </button>
          ))}
        </div>
      )}

      {/* 풀스크린 모달 */}
      {modalOpen && (
        <ImageModal imageUrls={imageUrls} startIndex={current} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

// ===== 대댓글 아이템 =====
function ReplyItem({
  reply,
  currentUserId,
  isAdmin,
  onDelete,
}: {
  reply: CommentItem;
  currentUserId: number | null;
  isAdmin: boolean;
  onDelete: (id: number, parentId: number) => void;
}) {
  const isOwner = (currentUserId !== null && reply.userId === currentUserId) || isAdmin;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('대댓글을 삭제할까요?')) return;
    setDeleting(true);
    try {
      await deleteComment(reply.id);
      onDelete(reply.id, reply.parentCommentId!);
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex gap-3 mt-3 ml-4 pl-4 border-l-2 border-black/5">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      </div>
      <div className="flex-1 bg-[#FAFAFA] px-4 py-3 rounded-[18px] border border-black/[0.03]">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-[13px]">{reply.loginId}</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] opacity-30">{formatRelative(reply.createdAt)}</span>
            {isOwner && (
              <button onClick={handleDelete} disabled={deleting}
                className="text-[10px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-40 bg-transparent border-none cursor-pointer p-0">
                삭제
              </button>
            )}
          </div>
        </div>
        <p className="text-[13px] leading-relaxed opacity-80 break-words">{reply.contents}</p>
      </div>
    </div>
  );
}

// ===== 댓글 아이템 =====
function CommentItem({
  comment,
  currentUserId,
  isAdmin,
  onDelete,
  onReplyDelete,
  onReplyPost,
  isLoggedIn,
}: {
  comment: CommentItem;
  currentUserId: number | null;
  isAdmin: boolean;
  onDelete: (id: number) => void;
  onReplyDelete: (replyId: number, parentId: number) => void;
  onReplyPost: (parentId: number, content: string) => Promise<void>;
  isLoggedIn: boolean;
}) {
  const isOwner = (currentUserId !== null && comment.userId === currentUserId) || isAdmin;
  const [deleting, setDeleting] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const [isPostingReply, setIsPostingReply] = useState(false);

  const handleDelete = async () => {
    if (!confirm('댓글을 삭제할까요?')) return;
    setDeleting(true);
    try {
      await deleteComment(comment.id);
      onDelete(comment.id);
    } catch {
      alert('댓글 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim()) return;
    setIsPostingReply(true);
    try {
      await onReplyPost(comment.id, replyInput.trim());
      setReplyInput('');
      setShowReplyInput(false);
    } catch {
      alert('대댓글 작성에 실패했습니다.');
    } finally {
      setIsPostingReply(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex gap-4">
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </div>
        <div className="flex-1 bg-white px-5 py-4 rounded-[24px] border border-black/[0.03]">
          <div className="flex items-center justify-between mb-1">
            <p className={`font-semibold text-[14px] ${comment.isDeleted ? 'opacity-30' : ''}`}>{comment.loginId}</p>
            <div className="flex items-center gap-3">
              <span className="text-[11px] opacity-30">{formatRelative(comment.createdAt)}</span>
              {!comment.isDeleted && isLoggedIn && (
                <button onClick={() => setShowReplyInput(v => !v)}
                  className="text-[11px] text-brand/60 hover:text-brand transition-colors bg-transparent border-none cursor-pointer p-0">
                  답글
                </button>
              )}
              {isOwner && !comment.isDeleted && (
                <button onClick={handleDelete} disabled={deleting}
                  className="text-[11px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-40 bg-transparent border-none cursor-pointer p-0">
                  삭제
                </button>
              )}
            </div>
          </div>
          <p className={`text-[14px] leading-relaxed break-words ${comment.isDeleted ? 'opacity-30 italic' : 'opacity-80'}`}>
            {comment.contents}
          </p>
        </div>
      </div>

      {/* 대댓글 목록 */}
      {comment.replies.map(reply => (
        <ReplyItem key={reply.id} reply={reply} currentUserId={currentUserId} isAdmin={isAdmin} onDelete={onReplyDelete} />
      ))}

      {/* 대댓글 입력창 */}
      {showReplyInput && (
        <form onSubmit={handlePostReply} className="flex gap-3 mt-3 ml-4 pl-4 border-l-2 border-brand/20 items-end">
          <textarea
            value={replyInput}
            onChange={e => setReplyInput(e.target.value)}
            placeholder="대댓글을 입력하세요..."
            rows={1}
            maxLength={500}
            className="flex-1 border border-black/10 bg-white rounded-[16px] px-4 py-2 font-[inherit] text-[13px] resize-none outline-none leading-relaxed placeholder:text-black/30"
          />
          <button type="submit" disabled={!replyInput.trim() || isPostingReply}
            className="bg-charcoal text-white border-none px-4 py-2 rounded-full font-semibold text-[12px] cursor-pointer hover:bg-brand transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
            {isPostingReply ? '등록 중...' : '등록'}
          </button>
          <button type="button" onClick={() => setShowReplyInput(false)}
            className="text-[12px] opacity-40 hover:opacity-70 bg-transparent border-none cursor-pointer p-0 flex-shrink-0">
            취소
          </button>
        </form>
      )}
    </div>
  );
}

// ===== 댓글 페이지네이션 =====
function CommentPagination({
  currentPage,
  totalPages,
  isLoading,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  const BLOCK = 10;
  if (totalPages <= 1) return null;
  const blockStart = Math.floor(currentPage / BLOCK) * BLOCK;
  const blockEnd = Math.min(blockStart + BLOCK, totalPages);
  const pages = Array.from({ length: blockEnd - blockStart }, (_, i) => blockStart + i);

  return (
    <div className="flex items-center justify-center gap-1.5 my-4 flex-wrap">
      <button
        onClick={() => onPageChange(blockStart - 1)}
        disabled={blockStart === 0 || isLoading}
        className="px-4 py-2 rounded-full text-[13px] font-medium bg-white border border-black/10 text-charcoal hover:bg-charcoal hover:text-white hover:border-transparent transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
      >
        이전
      </button>
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          disabled={isLoading}
          className={`w-10 h-10 rounded-full text-[13px] font-semibold transition-all duration-200 shadow-sm ${
            page === currentPage
              ? 'bg-charcoal text-white border-charcoal'
              : 'bg-white border border-black/10 text-charcoal hover:bg-charcoal hover:text-white hover:border-transparent'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {page + 1}
        </button>
      ))}
      <button
        onClick={() => onPageChange(blockEnd)}
        disabled={blockEnd >= totalPages || isLoading}
        className="px-4 py-2 rounded-full text-[13px] font-medium bg-white border border-black/10 text-charcoal hover:bg-charcoal hover:text-white hover:border-transparent transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
      >
        다음
      </button>
    </div>
  );
}

// ===== 메인 페이지 =====
export default function BoastDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const postId = Number(id);

  const [post, setPost] = useState<BoastPostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [postError, setPostError] = useState('');

  // 댓글
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentPage, setCommentPage] = useState(0);
  const [commentTotalPages, setCommentTotalPages] = useState(1);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // 좋아요
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isTogglingLike, setIsTogglingLike] = useState(false);

  // 삭제
  const [isDeleting, setIsDeleting] = useState(false);

  // 로그인 정보
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // StrictMode 이중 실행 방지용 ref
  const viewIncremented = useRef(false);

  // 로그인 상태 확인
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const uid = localStorage.getItem('userId');
    setIsLoggedIn(!!token);
    setCurrentUserId(uid ? Number(uid) : null);
    setIsAdmin(localStorage.getItem('role') === 'ROLE_ADMIN');
  }, []);

  // 게시글 조회 + 조회수 증가 (StrictMode 이중 호출 방지)
  useEffect(() => {
    (async () => {
      try {
        const data = await getBoastPost(postId);
        setPost(data);
        setLikeCount(data.likeCount);
        if (!viewIncremented.current) {
          viewIncremented.current = true;
          // 통합 API: 상세조회 + 조회수 증가 (GET /view/v3/{id})
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/meow/boast-cat/view/v3/${postId}`
          )
            .then(res => res.json())
            .then(json => {
              if (json.data != null) {
                setPost(prev => prev ? { ...prev, view: prev.view + 1 } : prev);
              }
            })
            .catch(() => {});
        }
      } catch (e) {
        setPostError(e instanceof Error ? e.message : '게시글을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [postId]);

  // 좋아요 여부 확인
  useEffect(() => {
    if (!isLoggedIn) return;
    getLikeStatus(postId).then(setLiked).catch(() => {});
  }, [postId, isLoggedIn]);

  // 댓글 로드
  const loadComments = useCallback(async (page: number) => {
    setIsLoadingComments(true);
    try {
      const data = await getBoastComments(postId, page, 10);
      setComments(data.content);
      setCommentPage(page);
      setCommentTotalPages(data.totalPages);
    } catch { /* 조용히 실패 */ }
    finally { setIsLoadingComments(false); }
  }, [postId]);

  useEffect(() => { loadComments(0); }, [loadComments]);

  // 좋아요 등록/취소
  const handleToggleLike = async () => {
    if (!isLoggedIn) { router.push('/login'); return; }
    if (isTogglingLike) return;
    setIsTogglingLike(true);
    try {
      if (liked) {
        const count = await unlikePost(postId);
        setLiked(false);
        setLikeCount(count);
      } else {
        const count = await likePost(postId);
        setLiked(true);
        setLikeCount(count);
      }
    } catch { /* 조용히 실패 */ }
    finally { setIsTogglingLike(false); }
  };

  // 원댓글 작성
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const raw: RegisterCommentResult = await postBoastComment(postId, commentInput.trim());
      const newComment: CommentItem = {
        id: raw.id,
        parentCommentId: null,
        contents: raw.content,
        isDeleted: false,
        userId: raw.userId,
        loginId: raw.userNickname || localStorage.getItem('nickname') || '',
        createdAt: raw.createdAt,
        updatedAt: raw.createdAt,
        replies: [],
      };
      setComments((prev) => [newComment, ...prev]);
      setCommentInput('');
      setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
    } catch {
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setIsPostingComment(false);
    }
  };

  // 대댓글 작성
  const handlePostReply = async (parentId: number, content: string) => {
    const raw = await postBoastComment(postId, content, parentId);
    const newReply: CommentItem = {
      id: raw.id,
      parentCommentId: parentId,
      contents: raw.content,
      isDeleted: false,
      userId: raw.userId,
      loginId: raw.userNickname || localStorage.getItem('nickname') || '',
      createdAt: raw.createdAt,
      updatedAt: raw.createdAt,
      replies: [],
    };
    setComments((prev) => prev.map((c) =>
      c.id === parentId ? { ...c, replies: [...c.replies, newReply] } : c
    ));
    setPost((prev) => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
  };

  // 원댓글 삭제 (대댓글 있으면 소프트삭제 표시, 없으면 제거)
  const handleDeleteComment = (commentId: number) => {
    setComments((prev) => prev.reduce<CommentItem[]>((acc, c) => {
      if (c.id !== commentId) { acc.push(c); return acc; }
      if (c.replies.length > 0) {
        acc.push({ ...c, isDeleted: true, contents: '삭제된 댓글입니다.' });
      }
      return acc;
    }, []));
    setPost((prev) => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev);
  };

  // 대댓글 삭제
  const handleDeleteReply = (replyId: number, parentId: number) => {
    setComments((prev) => prev.reduce<CommentItem[]>((acc, c) => {
      if (c.id !== parentId) { acc.push(c); return acc; }
      const newReplies = c.replies.filter((r) => r.id !== replyId);
      // 부모가 소프트삭제 + 대댓글 0개 → 부모도 제거
      if (c.isDeleted && newReplies.length === 0) return acc;
      acc.push({ ...c, replies: newReplies });
      return acc;
    }, []));
    setPost((prev) => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev);
  };

  // 게시글 삭제
  const handleDelete = async () => {
    if (!confirm('게시글을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    setIsDeleting(true);
    try {
      await deleteBoastPost(postId);
      router.push('/boast');
    } catch {
      alert('삭제에 실패했습니다.');
      setIsDeleting(false);
    }
  };

  // 로딩
  if (isLoading) {
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

  // 에러
  if (postError || !post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10">
          <div className="py-40 text-center">
            <p className="text-red-500 mb-4">{postError || '게시글을 찾을 수 없습니다.'}</p>
            <Link href="/boast" className="px-6 py-3 bg-charcoal text-white rounded-full text-sm font-medium no-underline">
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      <div className="max-w-[1440px] mx-auto px-5 md:px-10">

        {/* 뒤로가기 */}
        <Link
          href="/boast"
          className="inline-flex items-center gap-1.5 text-[13px] opacity-40 hover:opacity-70 transition-opacity no-underline text-charcoal mt-6 mb-4 block"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          일상 자랑하기 목록
        </Link>

        {/* 제목 */}
        <h1 className="text-[32px] md:text-[40px] font-bold tracking-[-0.04em] leading-[1.2] mb-3">
          {post.title}
        </h1>

        {/* 작성자 */}
        <div className="flex items-center gap-2 mb-8 opacity-60">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <span className="text-[14px] font-medium">{post.writerNickname ?? post.writer}</span>
          <span className="text-[13px] opacity-60">· {formatDate(post.createdAt)}</span>
        </div>

        {/* 2단 그리드: 메인 + 사이드바 */}
        <main className="pb-[120px] grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">

          {/* ===== 메인 콘텐츠 ===== */}
          <div>
            {/* 갤러리 */}
            <Gallery imageUrls={post.imageUrls ?? []} />

            {/* 본문 */}
            {post.contents ? (

              <p className="text-[18px] leading-[1.8] opacity-80 mb-10 whitespace-pre-line">
                {post.contents}
              </p>
            ) : (
              <p className="text-[15px] opacity-30 italic mb-10">내용이 없습니다.</p>
            )}

            {/* 통계 바 */}
            <div className="flex gap-6 py-6 border-t border-b border-black/5 mb-12">
              {/* 좋아요 (클릭 가능) */}
              <button
                onClick={handleToggleLike}
                disabled={isTogglingLike}
                className={`flex items-center gap-2 text-[14px] font-medium bg-transparent border-none cursor-pointer transition-colors duration-200 disabled:opacity-50 ${liked ? 'text-brand' : 'text-charcoal/40 hover:text-brand'}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {likeCount.toLocaleString()} Likes
              </button>

              <div className="flex items-center gap-2 text-[14px] font-medium text-charcoal/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {post.commentCount.toLocaleString()} Comments
              </div>

              <div className="flex items-center gap-2 text-[14px] font-medium text-charcoal/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {post.view.toLocaleString()} Views
              </div>
            </div>

            {/* ===== 댓글 섹션 ===== */}
            <section>
              <h3 className="text-[20px] font-semibold mb-6">
                댓글 <span className="opacity-30">{post.commentCount}</span>
              </h3>

              {/* 댓글 목록 */}
              {isLoadingComments ? (
                <div className="py-8 text-center opacity-30 text-[13px]">댓글을 불러오는 중...</div>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center opacity-30 text-[14px]">첫 댓글을 남겨보세요!</div>
              ) : (
                <>
                  {comments.map((c) => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      onDelete={handleDeleteComment}
                      onReplyDelete={handleDeleteReply}
                      onReplyPost={handlePostReply}
                      isLoggedIn={isLoggedIn}
                    />
                  ))}
                  <CommentPagination
                    currentPage={commentPage}
                    totalPages={commentTotalPages}
                    isLoading={isLoadingComments}
                    onPageChange={loadComments}
                  />
                </>
              )}

              {/* 댓글 입력 폼 */}
              {isLoggedIn ? (
                <form
                  onSubmit={handlePostComment}
                  className="mt-10 bg-white px-5 py-5 rounded-[32px] border border-white/60 flex gap-3 items-end"
                >
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="따뜻한 댓글을 남겨주세요..."
                    rows={2}
                    maxLength={500}
                    className="flex-1 border-none bg-transparent font-[inherit] text-[14px] resize-none outline-none min-h-[40px] leading-relaxed placeholder:text-black/30"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim() || isPostingComment}
                    className="bg-charcoal text-white border-none px-6 py-3 rounded-full font-semibold text-[13px] cursor-pointer hover:bg-brand transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isPostingComment ? '등록 중...' : '등록'}
                  </button>
                </form>
              ) : (
                <div className="mt-10 bg-white px-5 py-5 rounded-[32px] border border-white/60 text-center">
                  <p className="text-[13px] opacity-50 mb-2">댓글을 작성하려면 로그인이 필요합니다.</p>
                  <Link href="/login" className="text-[13px] font-semibold text-brand no-underline hover:opacity-70 transition-opacity">
                    로그인하기
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* ===== 사이드바 ===== */}
          <aside>
            <div className="bg-white rounded-[32px] p-8 sticky top-[120px] border border-black/[0.03]">
              <span className="text-[10px] uppercase tracking-[0.15em] text-brand mb-2 block font-semibold">
                Post Info
              </span>

              {/* 등록일 */}
              <div className="mb-6">
                <p className="text-[13px] opacity-60 mb-1">등록일</p>
                <p className="font-medium">{formatDate(post.createdAt)}</p>
              </div>

              {/* 작성자 */}
              <div className="mb-6">
                <p className="text-[13px] opacity-60 mb-2">작성자</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
                  <span className="font-medium text-[14px]">{post.writer}</span>
                </div>
              </div>

              {/* 통계 */}
              <div className="mb-8 flex flex-col gap-3">
                {[
                  { label: '👁 조회수', value: post.view.toLocaleString() },
                  { label: '❤️ 좋아요', value: likeCount.toLocaleString() },
                  { label: '💬 댓글', value: post.commentCount.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-[13px]">
                    <span className="opacity-50">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              {/* 목록으로 + 좋아요 버튼 */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleToggleLike}
                  disabled={isTogglingLike}
                  className={`w-full h-[54px] text-[15px] font-semibold border-none rounded-full cursor-pointer transition-colors duration-200 disabled:opacity-50 ${
                    liked ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-charcoal text-white hover:bg-brand'
                  }`}
                >
                  {liked ? '❤️ 좋아요 취소' : '🤍 좋아요'}
                </button>
                <Link
                  href="/boast"
                  className="w-full h-[44px] flex items-center justify-center bg-black/5 rounded-full text-[13px] font-medium text-charcoal no-underline hover:bg-black/10 transition-colors"
                >
                  목록으로 돌아가기
                </Link>
              </div>

              {/* 작성자 또는 관리자: 수정/삭제 버튼 */}
              {(currentUserId === post.userId || isAdmin) && (
                <div className="flex gap-2 mt-3 pt-4 border-t border-black/5">
                  {currentUserId === post.userId && (
                    <Link
                      href={`/boast/${postId}/edit`}
                      className="flex-1 h-[40px] flex items-center justify-center bg-black/5 rounded-full text-[13px] font-medium text-charcoal no-underline hover:bg-black/10 transition-colors"
                    >
                      수정
                    </Link>
                  )}
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 h-[40px] bg-red-50 text-red-500 rounded-full text-[13px] font-medium border-none cursor-pointer hover:bg-red-100 transition-colors disabled:opacity-40"
                  >
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </main>

      </div>

      {/* 상태 표시줄 */}
      <div className="fixed bottom-10 right-10 text-[10px] font-mono opacity-40 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        POST_DETAIL_ACTIVE // VIEW_COUNT_ASYNC
      </div>
    </div>
  );
}
