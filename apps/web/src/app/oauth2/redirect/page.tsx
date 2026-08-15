'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// 카카오 등 소셜 로그인 성공 후 백엔드가 리다이렉트하는 콜백 페이지
// 쿼리 파라미터로 받은 accessToken을 localStorage에 저장하고 메인으로 이동
function OAuth2RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (accessToken && userId && role) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('userId', userId);
      localStorage.setItem('role', role);
      // storage 이벤트는 같은 탭에서 자동 발화하지 않으므로 수동 dispatch → 헤더 syncAuth 트리거
      window.dispatchEvent(new StorageEvent('storage', { key: 'accessToken' }));
    }

    router.replace('/');
  }, [router, searchParams]);

  return null;
}

export default function OAuth2RedirectPage() {
  return (
    <Suspense fallback={null}>
      <OAuth2RedirectContent />
    </Suspense>
  );
}
