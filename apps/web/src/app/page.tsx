'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// 게시글 카드 데이터
const POST_CARDS = [
  {
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600',
    pill: 'Cat • 3 years',
    title: '루이의 행복한 오후',
    meta: '2.4k Likes • Today',
    offset: false,
  },
  {
    image: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&q=80&w=600',
    pill: 'Dog • Golden Retriever',
    title: '햇살 아래 댕댕이',
    meta: '1.1k Likes • 2h ago',
    offset: true,
  },
  {
    image: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&q=80&w=600',
    pill: 'Cat • 2 years',
    title: '공원 산책 데이',
    meta: '892 Purrs • 5h ago',
    offset: false,
  },
  {
    image: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&q=80&w=600',
    pill: 'Dog • Shiba Inu',
    title: '집사와 함께하는 휴일',
    meta: '4.2k Purrs • 12h ago',
    offset: true,
  },
];

// 실시간 알림 토스트 데이터
const NOTIFICATIONS = [
  {
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
    text: "<b>Minho</b>님이 '루이'의 게시물에 퍼를 보냈습니다.",
    positionClass: 'top-[10%] left-[5%]',
    delay: '0s',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100',
    text: '<b>Ji-won</b>님이 새로운 제보를 확인했습니다.',
    positionClass: 'top-[40%] left-[60%]',
    delay: '-2s',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=100',
    text: '<b>Kevin</b>님이 펫 커뮤니티에 가입했습니다.',
    positionClass: 'top-[70%] left-[20%]',
    delay: '-4s',
  },
];

export default function HomePage() {
  // 카드 요소에 대한 ref 배열 (마우스 패럴랙스 효과용)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 로그인 상태 (CTA 버튼 분기용)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(!!localStorage.getItem('accessToken'));
    syncAuth();
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  // 마우스 위치에 따라 카드를 살짝 움직이는 패럴랙스 효과
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      cardRefs.current.forEach((card, index) => {
        if (card) {
          const shift = (index + 1) * 5;
          card.style.transform = `translate(${(x - 0.5) * shift}px, ${(y - 0.5) * shift}px) scale(1)`;
        }
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <main className="min-h-[200vh] overflow-x-hidden">
      {/* 메시 그라디언트 배경 오버레이 */}

      <div className="max-w-[1440px] mx-auto px-5 md:px-10">

        {/* ===== 히어로 섹션 ===== */}
        <section className="pt-16 md:pt-[120px] pb-16 md:pb-20 text-center">
<h1 className="text-4xl md:text-6xl lg:text-[72px] font-semibold leading-[1.1] tracking-[-0.04em] mb-8 md:mb-10">
            반려동물과의 소중한 순간,<br />
            서로 공유하며 함께 지켜가는 공간.
          </h1>
          <p className="max-w-[600px] mx-auto opacity-60 leading-relaxed text-base md:text-lg px-4">
            매일매일 반려동물과의 소중한 순간을 기록하고,<br className="hidden md:block" />
            전국의 집사들과 함께 실종 가족을 되찾는 든든한 연결.
          </p>
        </section>

        {/* ===== 구분선 01 ===== */}
        <div className="w-full h-px bg-black/5 relative my-8">
          <div className="absolute -top-2 left-[10%] bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.1em] opacity-40">
            Feature 01 — The Family
          </div>
        </div>

        {/* ===== 게시글 카드 그리드 ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-8">
          {POST_CARDS.map((card, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              className={`
                relative overflow-hidden rounded-[32px] md:rounded-[48px]
                aspect-[1/1.1] cursor-default
                transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
                hover:-translate-y-2 hover:scale-[1.02]
                ${card.offset ? 'translate-y-10' : ''}
              `}
            >
              {/* 카드 배경 이미지 */}
              <img
                src={card.image}
                alt={card.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              {/* 그라디언트 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 z-10" />
              {/* 카드 텍스트 */}
              <div className="absolute inset-0 p-5 md:p-8 flex flex-col justify-end text-white z-20">
                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-semibold uppercase w-fit mb-2">
                  {card.pill}
                </div>
                <h3 className="text-base md:text-xl font-semibold mb-1">{card.title}</h3>
                <div className="text-xs opacity-80">{card.meta}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== 구분선 02 ===== */}
        <div className="w-full h-px bg-black/5 relative mt-24 mb-10">
          <div className="absolute -top-2 left-[10%] bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.1em] opacity-40">
            Feature 02 — The Guardian
          </div>
        </div>

        {/* ===== 피처 쇼케이스 ===== */}
        <div className="flex flex-col lg:flex-row gap-6 mb-24 md:mb-[120px]">
          {/* 메인 카드 (맵 배경) */}
          <div className="flex-[2] h-[400px] md:h-[600px] rounded-[40px] md:rounded-[64px] overflow-hidden relative bg-white/40 border border-white/60">
            <img
              src="https://images.unsplash.com/photo-1548247416-ec66f4900b2e?auto=format&fit=crop&q=80&w=1200"
              className="w-full h-full object-cover opacity-80"
              alt="실종 지도"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent,rgba(0,0,0,0.4))]" />
            <div className="absolute top-8 md:top-10 left-8 md:left-10">
              <div className="bg-brand text-white px-3 py-1 rounded-full text-[10px] font-semibold mb-4 w-fit">
                지금 도움이 필요해요
              </div>
              <h2 className="text-white text-2xl md:text-[32px] font-semibold">실시간 실종 반려동물 신고망</h2>
            </div>
            <div className="absolute bottom-8 md:bottom-10 right-8 md:right-10 text-right text-white">
              <div className="text-[10px] opacity-60 tracking-[0.1em] mb-2">TARGET AREA</div>
              <div className="text-xl md:text-2xl font-medium">Seoul, Gangnam-gu</div>
            </div>
          </div>

          {/* 사이드 카드 2개 */}
          <div className="flex-1 flex flex-col gap-6">
            {/* 경보 카드 (어두운 배경 + 스캔 라인) */}
            <div className="flex-1 rounded-[40px] md:rounded-[48px] bg-charcoal text-white p-8 md:p-10 flex flex-col justify-center relative overflow-hidden min-h-[200px]">
              <h3 className="text-xl md:text-2xl mb-3">댕댕이를 찾습니다</h3>
              <p className="opacity-60 text-sm leading-relaxed">
                강남구 역삼동 인근에서 마지막으로 목격된 골든 리트리버 '초코'를
                찾고 있습니다. 제보 부탁드립니다.
              </p>
            </div>

            {/* 정보 카드 (흰 배경) */}
            <div className="flex-1 rounded-[40px] md:rounded-[48px] bg-white p-8 md:p-10 flex flex-col justify-center border border-black/[0.03] min-h-[200px]">
              <h3 className="text-xl md:text-2xl mb-3">근처 반려인에게 바로 전달</h3>
              <p className="opacity-60 text-sm leading-relaxed">
                실종 신고가 등록되면 주변 지역의 반려인들에게
                실시간으로 알림이 전송됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* ===== 실시간 피드 섹션 ===== */}
        <div className="relative my-16 md:my-20">
          <div className="text-center mb-12 md:mb-[60px]">
            <span className="text-[10px] uppercase tracking-[0.15em] text-brand mb-4 block font-semibold">
              Live Activity Feed
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em]">
              고양이들의 따뜻한 연결
            </h2>
          </div>

          {/* 떠다니는 알림 토스트 */}
          <div className="h-[300px] relative hidden md:block">
            {NOTIFICATIONS.map((n, i) => (
              <div
                key={i}
                className={`absolute bg-white px-5 py-3 rounded-[20px] shadow-lg flex items-center gap-3 w-max ${n.positionClass}`}
                style={{ animation: `float 6s ease-in-out infinite`, animationDelay: n.delay }}
              >
                <img
                  src={n.avatar}
                  className="w-8 h-8 rounded-full object-cover"
                  alt="사용자"
                />
                <span
                  className="text-[13px]"
                  dangerouslySetInnerHTML={{ __html: n.text }}
                />
              </div>
            ))}
          </div>

          {/* 모바일: 알림 목록 형태로 표시 */}
          <div className="flex flex-col gap-3 md:hidden">
            {NOTIFICATIONS.map((n, i) => (
              <div key={i} className="bg-white px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3">
                <img src={n.avatar} className="w-8 h-8 rounded-full object-cover" alt="사용자" />
                <span className="text-[13px]" dangerouslySetInnerHTML={{ __html: n.text }} />
              </div>
            ))}
          </div>
        </div>

        {/* ===== 최종 CTA 섹션 ===== */}
        <section className="py-24 md:py-40 text-center">
          <h2 className="text-3xl md:text-5xl lg:text-[56px] font-semibold mb-8 md:mb-10 tracking-[-0.04em] leading-[1.2]">
            반려동물을 사랑하는 모든 집사들의<br className="hidden md:block" />
            든든한 커뮤니티.
          </h2>
          <Link
            href={isLoggedIn ? '/boast' : '/join'}
            className="inline-flex items-center gap-4 bg-charcoal text-white px-10 md:px-16 py-5 md:py-6 rounded-full text-base md:text-lg font-semibold no-underline hover:bg-brand hover:scale-105 transition-all duration-300"
          >
            {isLoggedIn ? '일상 공유 둘러보기' : '지금 가입하기'}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </section>

      </div>

    </main>
  );
}
