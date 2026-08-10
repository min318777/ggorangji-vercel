'use client';

import Header from './Header';
import BottomNav from './BottomNav';

// 앱 전체에서 Header를 한 번만 마운트 — SSE 재연결 방지
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="pb-[60px] md:pb-0">
        {children}
      </div>
      <BottomNav />
    </>
  );
}