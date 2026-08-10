import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 브랜드 색상 (#E8833A - 디자인의 --amber)
        brand: {
          DEFAULT: '#E8833A',
          dark: '#D4722F',
        },
        // 차콜 색상 (#1A1A1A - 디자인의 --charcoal)
        charcoal: '#1A1A1A',
      },
      fontFamily: {
        main: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        // 실종신고 카드의 스캔 라인 애니메이션
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(600px)' },
        },
        // 알림 토스트의 부유 애니메이션
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        scan: 'scan 4s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
