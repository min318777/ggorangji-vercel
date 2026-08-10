import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import ClientLayout from '@/components/common/ClientLayout';

export const metadata: Metadata = {
  title: 'petie — Premium Cat Social Collective',
  description: '반려동물과의 소중한 순간을 공유하고 실종 가족을 함께 찾는 프리미엄 소셜 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const naverClientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? '';

  return (
    <html lang="ko">
      <head>
        {/* Pretendard 웹폰트 로드 */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body>
        <ClientLayout>
        {children}
        </ClientLayout>
        {/* 네이버 지도 스크립트 — 앱 전체에서 한 번만 로드 */}
        <Script
          src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${naverClientId}&submodules=geocoder`}
          strategy="afterInteractive"
        />
        {/* 카카오 우편번호 서비스 — 주소 검색 팝업 */}
        <Script
          src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
