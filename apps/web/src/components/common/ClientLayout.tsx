'use client';

import Header from './Header';

// 앱 전체에서 Header를 한 번만 마운트 — SSE 재연결 방지
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}