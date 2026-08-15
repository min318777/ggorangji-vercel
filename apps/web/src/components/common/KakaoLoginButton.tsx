'use client';

// 카카오 로그인 버튼 — 로그인/회원가입 페이지 공용
// 클릭 시 백엔드 OAuth2 인가 엔드포인트로 이동, 최초 방문자는 자동 가입 + 로그인, 재방문자는 로그인만 처리됨
export default function KakaoLoginButton() {
  const handleClick = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
    window.location.href = `${apiUrl}/oauth2/authorization/kakao`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-semibold bg-[#FEE500] text-[#191600] hover:brightness-95 transition-all duration-200"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 3C6.477 3 2 6.463 2 10.732c0 2.732 1.833 5.13 4.594 6.494-.2.75-.727 2.72-.833 3.142-.13.52.19.514.4.374.164-.11 2.61-1.77 3.67-2.49.71.104 1.44.16 2.169.16 5.523 0 10-3.463 10-7.68S17.523 3 12 3z"
          fill="#191600"
        />
      </svg>
      카카오로 계속하기
    </button>
  );
}
