import StatusBar from '@/components/common/StatusBar';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-[720px] mx-auto px-6 py-16 md:py-24 w-full">

        {/* 타이틀 */}
        <h1 className="text-[32px] md:text-[38px] font-bold mb-10">소개</h1>

        {/* 프로젝트 목적 */}
        <div className="space-y-5 text-[17px] font-medium leading-[1.9] mb-14">
          <p>꼬랑지는 반려동물을 사랑하는 사람들을 위해 만든 소셜 커뮤니티입니다.<br />반려동물과의 소중한 일상을 함께 나누고,<br />실종된 가족을 함께 찾아주는 따뜻한 연결을 목표로 하고 있습니다.</p>
          <p>간단한 회원가입 후 반려동물의 일상을 사진과 글로 자유롭게 올릴 수 있습니다.<br />예쁜 순간, 재밌는 모습, 소소한 하루까지 기록해두면 나중에 돌아보기에도 좋습니다.</p>
          <p>자신의 반려동물이나 지인의 반려동물이 실종됐을 때, 혹은 길에서 주인을 잃은 동물을<br />목격했을 때 신고나 제보를 남겨주세요.<br />작은 제보 하나가 큰 도움이 됩니다.</p>
        </div>

        {/* 구분선 */}
        <div className="border-t border-black/10 mb-12" />

        {/* 문의사항 */}
        <section className="mb-12">
          <h2 className="text-[32px] md:text-[38px] font-bold mb-10">문의 및 피드백</h2>
          <p className="text-[17px] font-medium mb-6 leading-relaxed">서비스 이용 중 불편한 점, 버그 제보, 개선 제안이 있으시면 아래 버튼을 통해 편하게 남겨주세요.</p>
          <a
            href="https://forms.gle/2RnSGCUg7Sh5DfrT6"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-black/20 text-[14px] font-bold opacity-70 hover:opacity-100 hover:border-black/50 transition-all duration-200 no-underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            문의하기
          </a>
        </section>



      </div>

      <StatusBar text="AUTH_SERVICE_READY // PROD_NODE_04" />
    </div>
  );
}
