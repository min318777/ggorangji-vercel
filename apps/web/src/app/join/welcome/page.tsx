'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/common/StatusBar';
import { Suspense } from 'react';

function WelcomeContent() {
  const searchParams = useSearchParams();
  const loginId = searchParams.get('id') ?? '';

  return (
    <div className="min-h-screen flex items-center justify-center relative pt-16">
      <div className="w-full max-w-[480px] px-5 relative z-10">
        <div className="bg-white border border-gray-100 rounded-[48px] p-14 sm:p-16 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">

          {/* 타이틀 */}
          <div className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.15em] text-brand mb-4 block font-semibold">
              Welcome
            </span>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] mb-2">가입을 환영합니다!</h1>
            <p className="text-sm opacity-60 leading-relaxed">
              {loginId && (
                <>
                  <span className="font-semibold text-charcoal opacity-100">{loginId}</span>
                  {' '}아이디로{' '}
                </>
              )}
              로그인 후 반려동물과의 소중한 순간을 기록해보세요.
            </p>
          </div>

          {/* 체크 아이콘 */}
          <div className="flex justify-center mb-10">
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8833A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          {/* 로그인 버튼 */}
          <Link
            href="/login"
            className="w-full bg-brand text-white py-5 rounded-full text-base font-semibold flex justify-center items-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(232,131,58,0.2)] transition-all duration-300"
          >
            로그인하러 가기
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>

          {/* 홈으로 */}
          <div className="mt-6 text-center text-[13px] opacity-80">
            <Link
              href="/"
              className="text-charcoal font-semibold underline decoration-black/20 underline-offset-4 hover:decoration-charcoal transition-all duration-300"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>

      <StatusBar text="SECURE_AUTH_NODE // ACTIVE" />
    </div>
  );
}

export default function JoinWelcomePage() {
  return (
    <Suspense>
      <WelcomeContent />
    </Suspense>
  );
}