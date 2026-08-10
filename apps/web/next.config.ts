import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // 동적 경로의 라우터 캐시 비활성화 — 상태 변경 후 목록/상세 재진입 시 최신 데이터 보장
    staleTimes: {
      dynamic: 0,
    },
  },
  images: {
    // Unsplash 이미지 최적화 허용
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
