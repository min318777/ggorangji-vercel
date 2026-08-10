'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api/auth';

export default function LoginPage() {
  const router = useRouter();

  // 폼 상태
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  // UI 상태
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ loginId, password });
      // 로그인 성공 → 메인 페이지로 이동
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative pt-16"
    >
      {/* 로그인 카드 */}
      <div className="w-full max-w-[480px] px-5 relative z-10">
        <div className="bg-white border border-gray-100 rounded-[48px] p-14 sm:p-16 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">

          {/* 타이틀 */}
          <div className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.15em] text-brand mb-4 block font-semibold">
              Welcome Back
            </span>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] mb-2">다시 만나서 반가워요.</h1>
            <p className="text-sm opacity-60">반려동물과의 소중한 순간을 계속 기록해보세요.</p>
          </div>

          {/* 로그인 폼 */}
          <form onSubmit={handleSubmit}>
            {/* 서버 에러 메시지 */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            {/* 아이디 입력 */}
            <div className="mb-6">
              <label className="block text-[12px] font-semibold mb-2 opacity-80">로그인 ID</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="5~20자 영문/숫자 (예: catlover01)"
                required
                autoComplete="username"
                className="w-full bg-gray-50 border border-gray-200 px-5 py-4 rounded-2xl text-[15px] outline-none transition-all duration-300 focus:bg-white focus:border-brand focus:shadow-[0_0_0_4px_rgba(232,131,58,0.1)] placeholder:text-black/30"
              />
            </div>

            {/* 비밀번호 입력 */}
            <div className="mb-6">
              <label className="block text-[12px] font-semibold mb-2 opacity-80">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="영문+숫자 필수 포함"
                required
                autoComplete="current-password"
                className="w-full bg-gray-50 border border-gray-200 px-5 py-4 rounded-2xl text-[15px] outline-none transition-all duration-300 focus:bg-white focus:border-brand focus:shadow-[0_0_0_4px_rgba(232,131,58,0.1)] placeholder:text-black/30"
              />
            </div>


            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand text-white py-5 rounded-full text-base font-semibold flex justify-center items-center gap-3 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(232,131,58,0.2)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                '로그인 중...'
              ) : (
                <>
                  로그인
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <div className="mt-8 text-center text-[13px] opacity-80">
            아직 회원이 아니신가요?{' '}
            <Link
              href="/join"
              className="text-charcoal font-semibold underline decoration-black/20 underline-offset-4 hover:decoration-charcoal transition-all duration-300"
            >
              지금 가입하기
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
