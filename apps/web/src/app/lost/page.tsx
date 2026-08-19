'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getLostPosts,
  getNearbyLostPosts,
  getNearbyLostPostsST,
  searchLostByFts,
  searchLostByLike,
  type LostPostItem,
} from '@/lib/api/posts';

function formatDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

const THUMB_GRADIENTS = [
  'from-slate-100 to-blue-50',
  'from-rose-50 to-pink-100',
  'from-amber-50 to-orange-100',
  'from-sky-50 to-indigo-100',
  'from-emerald-50 to-teal-100',
  'from-purple-50 to-violet-100',
];

function SosCard({ post }: { post: LostPostItem }) {
  const gradient = THUMB_GRADIENTS[post.id % THUMB_GRADIENTS.length];
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/lost/${post.id}`)}
      className="group cursor-pointer relative aspect-[1/1.1] overflow-hidden rounded-[32px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:scale-[1.02]"
    >
      {/* 배경 이미지 */}
      {post.thumbnailUrl ? (
        <img
          src={post.thumbnailUrl}
          alt={post.title}
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${post.completed ? 'grayscale-[0.4]' : ''}`}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* 하단 그라디언트 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/65" />

      {/* 상태 뱃지 */}
      <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-[11px] font-bold z-10 ${
        post.completed ? 'bg-emerald-500 text-white opacity-90' : 'bg-red-500 text-white'
      }`}>
        {post.completed ? '귀가 완료' : '찾는 중'}
      </div>

      {/* 텍스트 */}
      <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
        <h3 className="text-[14px] md:text-[15px] font-semibold leading-[1.4] line-clamp-2 mb-1.5">
          {post.title}
        </h3>
        {post.lostLocation && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-white">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {post.lostLocation}
          </div>
        )}
      </div>
    </div>
  );
}

type TabKey = 'all' | 'nearby' | 'nearby-st';

function SkeletonCard() {
  return (
    <div className="animate-pulse aspect-[1/1.1] bg-black/5 rounded-[32px]" />
  );
}

function ElapsedBadge({ ms }: { ms: number }) {
  const color = ms < 100 ? 'text-emerald-600' : ms < 500 ? 'text-amber-500' : 'text-red-500';
  return <span className={`text-[12px] font-mono font-semibold ${color}`}>{ms.toFixed(0)}ms</span>;
}

const MAX_PAGES = 50;
const BLOCK_SIZE = 10;
const PAGE_SIZE = 28;
// PC는 GPS가 없어 고정밀 모드가 오히려 느림, 1분 이내 캐시된 위치는 재사용
const GEOLOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 };

function Pagination({
  currentPage,
  totalPages,
  isLoading,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}) {
  const cappedTotal = Math.min(totalPages, MAX_PAGES);
  if (cappedTotal <= 1) return null;

  const blockStart = Math.floor(currentPage / BLOCK_SIZE) * BLOCK_SIZE;
  const blockEnd = Math.min(blockStart + BLOCK_SIZE, cappedTotal);
  const pages = Array.from({ length: blockEnd - blockStart }, (_, i) => blockStart + i);

  return (
    <div className="flex items-center justify-center gap-1.5 mb-20 flex-wrap">
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
        disabled={blockEnd >= cappedTotal || isLoading}
        className="px-4 py-2 rounded-full text-[13px] font-medium bg-white border border-black/10 text-charcoal hover:bg-charcoal hover:text-white hover:border-transparent transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
      >
        다음
      </button>
    </div>
  );
}

export default function LostPage() {
  const [tab, setTab] = useState<TabKey>('all');

  // 전체 목록 상태
  const [posts, setPosts] = useState<LostPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // 내 주변 상태
  const [nearbyPosts, setNearbyPosts] = useState<LostPostItem[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState('');
  const [nearbyPage, setNearbyPage] = useState(0);
  const [nearbyTotalPages, setNearbyTotalPages] = useState(1);
  const [nearbyTotalElements, setNearbyTotalElements] = useState(0);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 내 주변 ST 상태
  const [nearbyStPosts, setNearbyStPosts] = useState<LostPostItem[]>([]);
  const [nearbyStLoading, setNearbyStLoading] = useState(false);
  const [nearbyStError, setNearbyStError] = useState('');
  const [nearbyStPage, setNearbyStPage] = useState(0);
  const [nearbyStTotalPages, setNearbyStTotalPages] = useState(1);
  const [nearbyStTotalElements, setNearbyStTotalElements] = useState(0);

  // 서버 검색 상태
  const [searchInput, setSearchInput] = useState('');
  const [searchMode, setSearchMode] = useState<'fts' | 'like' | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<LostPostItem[]>([]);
  const [searchCurrentPage, setSearchCurrentPage] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(1);
  const [searchTotalElements, setSearchTotalElements] = useState(0);
  const [searchElapsed, setSearchElapsed] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // 첫 로드
  useEffect(() => {
    (async () => {
      try {
        const data = await getLostPosts(0, PAGE_SIZE);
        setPosts(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        setCurrentPage(0);
      } catch (e) {
        setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // 전체 목록 페이지 변경
  const handlePageChange = useCallback(async (page: number) => {
    if (isLoading) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsLoading(true);
    try {
      const data = await getLostPosts(page, PAGE_SIZE);
      setPosts(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setCurrentPage(page);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // 내 주변 탭
  const handleNearbyTab = useCallback(() => {
    setTab('nearby');
    if (myLocation) return;
    if (!navigator.geolocation) {
      setNearbyError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }
    setNearbyLoading(true);
    setNearbyError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMyLocation({ lat, lng });
        try {
          const data = await getNearbyLostPosts(lat, lng, 3, 0, PAGE_SIZE);
          setNearbyPosts(data.content);
          setNearbyTotalPages(data.totalPages);
          setNearbyTotalElements(data.totalElements);
          setNearbyPage(0);
        } catch (e) {
          setNearbyError(e instanceof Error ? e.message : '주변 실종글을 불러오지 못했습니다.');
        } finally {
          setNearbyLoading(false);
        }
      },
      () => {
        setNearbyError('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.');
        setNearbyLoading(false);
      },
      GEOLOCATION_OPTIONS
    );
  }, [myLocation]);

  // 내 주변 ST 탭
  const handleNearbyStTab = useCallback(() => {
    setTab('nearby-st');
    if (myLocation) {
      setNearbyStLoading(true);
      setNearbyStError('');
      getNearbyLostPostsST(myLocation.lat, myLocation.lng, 3, 0, PAGE_SIZE)
        .then((data) => {
          setNearbyStPosts(data.content);
          setNearbyStTotalPages(data.totalPages);
          setNearbyStTotalElements(data.totalElements);
          setNearbyStPage(0);
        })
        .catch((e) => setNearbyStError(e instanceof Error ? e.message : '주변 실종글을 불러오지 못했습니다.'))
        .finally(() => setNearbyStLoading(false));
      return;
    }
    if (!navigator.geolocation) {
      setNearbyStError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      return;
    }
    setNearbyStLoading(true);
    setNearbyStError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMyLocation({ lat, lng });
        try {
          const data = await getNearbyLostPostsST(lat, lng, 3, 0, PAGE_SIZE);
          setNearbyStPosts(data.content);
          setNearbyStTotalPages(data.totalPages);
          setNearbyStTotalElements(data.totalElements);
          setNearbyStPage(0);
        } catch (e) {
          setNearbyStError(e instanceof Error ? e.message : '주변 실종글을 불러오지 못했습니다.');
        } finally {
          setNearbyStLoading(false);
        }
      },
      () => {
        setNearbyStError('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.');
        setNearbyStLoading(false);
      },
      GEOLOCATION_OPTIONS
    );
  }, [myLocation]);

  // 내 주변 ST 페이지 변경
  const handleNearbyStPageChange = useCallback(async (page: number) => {
    if (!myLocation || nearbyStLoading) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNearbyStLoading(true);
    try {
      const data = await getNearbyLostPostsST(myLocation.lat, myLocation.lng, 3, page, PAGE_SIZE);
      setNearbyStPosts(data.content);
      setNearbyStTotalPages(data.totalPages);
      setNearbyStTotalElements(data.totalElements);
      setNearbyStPage(page);
    } catch { /* 조용히 실패 */ }
    finally { setNearbyStLoading(false); }
  }, [myLocation, nearbyStLoading]);

  // 내 주변 페이지 변경
  const handleNearbyPageChange = useCallback(async (page: number) => {
    if (!myLocation || nearbyLoading) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNearbyLoading(true);
    try {
      const data = await getNearbyLostPosts(myLocation.lat, myLocation.lng, 3, page, PAGE_SIZE);
      setNearbyPosts(data.content);
      setNearbyTotalPages(data.totalPages);
      setNearbyTotalElements(data.totalElements);
      setNearbyPage(page);
    } catch { /* 조용히 실패 */ }
    finally { setNearbyLoading(false); }
  }, [myLocation, nearbyLoading]);

  // 서버 검색 실행
  const handleSearch = async (mode: 'fts' | 'like') => {
    const kw = searchInput.trim();
    if (kw.length < 2) {
      setSearchError('검색어는 2글자 이상 입력해주세요.');
      return;
    }
    setSearchError('');
    setIsSearching(true);
    setSearchMode(mode);
    setSearchKeyword(kw);
    const fn = mode === 'fts' ? searchLostByFts : searchLostByLike;
    const t0 = performance.now();
    try {
      const data = await fn(kw, 0, PAGE_SIZE);
      setSearchElapsed(performance.now() - t0);
      setSearchResults(data.content);
      setSearchTotalPages(data.totalPages);
      setSearchTotalElements(data.totalElements);
      setSearchCurrentPage(0);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : '검색에 실패했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 페이지 변경
  const handleSearchPageChange = useCallback(async (page: number) => {
    if (!searchMode || isSearching) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsSearching(true);
    const fn = searchMode === 'fts' ? searchLostByFts : searchLostByLike;
    const t0 = performance.now();
    try {
      const data = await fn(searchKeyword, page, PAGE_SIZE);
      setSearchElapsed(performance.now() - t0);
      setSearchResults(data.content);
      setSearchTotalPages(data.totalPages);
      setSearchTotalElements(data.totalElements);
      setSearchCurrentPage(page);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : '검색에 실패했습니다.');
    } finally {
      setIsSearching(false);
    }
  }, [searchMode, searchKeyword, isSearching]);

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchMode(null);
    setSearchKeyword('');
    setSearchResults([]);
    setSearchElapsed(null);
    setSearchError('');
  };

  const isSearchMode = searchMode !== null && searchKeyword !== '';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1440px] mx-auto px-5 md:px-10">

        {/* 헤더 컨트롤 */}
        <section className="pt-6 md:pt-10 pb-8 md:pb-10">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-5">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center flex-wrap">

              {/* 검색 입력 필드 */}
              <div className="flex items-center gap-3 bg-white border border-black/5 px-6 py-3 rounded-full min-w-[260px] focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10 transition-all duration-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-30 flex-shrink-0">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch('fts'); }}
                  placeholder="제목, 고양이 이름, 위치 검색"
                  className="border-none outline-none w-full text-[14px] bg-transparent placeholder:text-black/30"
                />
                {searchInput && (
                  <button onClick={handleClearSearch} className="opacity-30 hover:opacity-60 transition-opacity flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* 검색 버튼 */}
              <button
                onClick={() => handleSearch('fts')}
                disabled={isSearching}
                className={`flex items-center gap-2 px-4 py-3 rounded-full text-[13px] font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border
                  ${searchMode !== null
                    ? 'bg-charcoal text-white border-charcoal shadow-md'
                    : 'bg-white text-charcoal border-black/10 hover:bg-black/5'}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {isSearching ? '검색 중...' : '검색'}
              </button>
            </div>

            {/* 실종 신고 버튼 */}
            <Link
              href="/lost/write"
              className="flex items-center gap-2 px-5 py-3 bg-charcoal text-white rounded-full text-[13px] font-semibold no-underline hover:bg-gray-800 transition-colors duration-300 self-start sm:self-auto"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              실종신고
            </Link>
          </div>

          {/* 검색 상태 / 게시글 수 */}
          {!isLoading && (
            <div className="flex flex-col gap-1">
              {isSearchMode ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-charcoal/10 text-charcoal">
                    검색결과
                  </span>
                  <p className="text-[13px] opacity-50">
                    &ldquo;{searchKeyword}&rdquo; 검색결과
                  </p>
                  <button onClick={handleClearSearch} className="text-[12px] opacity-40 hover:opacity-70 underline transition-opacity">
                    초기화
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-3">
                  {/* 탭 */}
                  <button
                    onClick={() => setTab('all')}
                    className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-colors ${tab === 'all' ? 'bg-charcoal text-white' : 'bg-white border border-black/10 text-charcoal hover:bg-black/5'}`}
                  >
                    전체
                  </button>
                  <button
                    onClick={handleNearbyStTab}
                    className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-[13px] font-semibold transition-colors ${tab === 'nearby-st' ? 'bg-charcoal text-white' : 'bg-white border border-black/10 text-charcoal hover:bg-black/5'}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    내 주변
                  </button>
                </div>
              )}
              {searchError && <p className="text-[13px] text-rose-500">{searchError}</p>}
            </div>
          )}
        </section>

        <div className="w-full h-[1px] bg-black/5 mb-8" />

        {/* ===== 검색 결과 ===== */}
        {isSearchMode && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 mb-10">
              {isSearching
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)
                : searchResults.length === 0
                ? (
                  <div className="col-span-full py-20 text-center opacity-50">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-40">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <p className="text-[15px]">검색 결과가 없습니다.</p>
                  </div>
                )
                : searchResults.map((post) => <SosCard key={post.id} post={post} />)
              }
            </div>
            <Pagination
              currentPage={searchCurrentPage}
              totalPages={searchTotalPages}
              isLoading={isSearching}
              onPageChange={handleSearchPageChange}
            />
          </>
        )}

        {/* ===== 전체 탭 ===== */}
        {!isSearchMode && tab === 'all' && (
          error ? (
            <div className="py-20 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={() => window.location.reload()} className="px-6 py-3 bg-charcoal text-white rounded-full text-sm font-medium">다시 시도</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 mb-10">
                {isLoading
                  ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)
                  : posts.length === 0
                  ? (
                    <div className="col-span-full py-20 text-center opacity-50">
                      <p className="text-[15px]">실종 신고가 없습니다.</p>
                    </div>
                  )
                  : posts.map((post) => <SosCard key={post.id} post={post} />)
                }
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                isLoading={isLoading}
                onPageChange={handlePageChange}
              />
            </>
          )
        )}

        {/* ===== 내 주변 탭 ===== */}
        {!isSearchMode && tab === 'nearby' && (
          nearbyLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 mb-10">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : nearbyError ? (
            <div className="py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-30">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-[15px] text-red-400 mb-4">{nearbyError}</p>
              <button onClick={handleNearbyTab} className="px-6 py-3 bg-charcoal text-white rounded-full text-sm font-medium">다시 시도</button>
            </div>
          ) : !myLocation ? (
            <div className="py-20 text-center opacity-40"><p className="text-[15px]">위치 정보를 가져오는 중...</p></div>
          ) : nearbyPosts.length === 0 ? (
            <div className="py-20 text-center opacity-50">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-40">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <p className="text-[15px]">반경 5km 내 실종 신고가 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 mb-10">
                {nearbyPosts.map((post) => <SosCard key={post.id} post={post} />)}
              </div>
              <Pagination
                currentPage={nearbyPage}
                totalPages={nearbyTotalPages}
                isLoading={nearbyLoading}
                onPageChange={handleNearbyPageChange}
              />
            </>
          )
        )}

        {/* ===== 내 주변 ST 탭 ===== */}
        {!isSearchMode && tab === 'nearby-st' && (
          nearbyStLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 mb-10">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : nearbyStError ? (
            <div className="py-20 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-30">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              </svg>
              <p className="text-[15px] text-red-400 mb-4">{nearbyStError}</p>
              <button onClick={handleNearbyStTab} className="px-6 py-3 bg-charcoal text-white rounded-full text-sm font-medium">다시 시도</button>
            </div>
          ) : !myLocation ? (
            <div className="py-20 text-center opacity-40"><p className="text-[15px]">위치 정보를 가져오는 중...</p></div>
          ) : nearbyStPosts.length === 0 ? (
            <div className="py-20 text-center opacity-50">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-40">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              </svg>
              <p className="text-[15px]">반경 5km 내 실종 신고가 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 mb-10">
                {nearbyStPosts.map((post) => <SosCard key={post.id} post={post} />)}
              </div>
              <Pagination
                currentPage={nearbyStPage}
                totalPages={nearbyStTotalPages}
                isLoading={nearbyStLoading}
                onPageChange={handleNearbyStPageChange}
              />
            </>
          )
        )}

      </div>
    </div>
  );
}
