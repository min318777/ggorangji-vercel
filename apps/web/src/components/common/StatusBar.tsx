// 화면 우하단 고정 시스템 상태 표시 바
interface StatusBarProps {
  text: string;
}

export default function StatusBar({ text }: StatusBarProps) {
  return (
    <div className="fixed bottom-10 right-10 text-[10px] font-mono opacity-40 flex items-center gap-2 z-50 pointer-events-none">
      {/* 초록 상태 점 */}
      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
      {text}
    </div>
  );
}
