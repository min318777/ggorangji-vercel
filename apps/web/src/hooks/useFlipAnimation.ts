import { useLayoutEffect, useRef } from 'react';

/**
 * 리스트 순서가 바뀔 때 각 항목이 이전 위치에서 새 위치로 부드럽게 이동하는 애니메이션 훅 (FLIP 기법)
 * 대상 요소에는 data-flip-id={고유id} 를 붙여야 함
 * @param items 순서 변경을 감지할 고유 id 배열 (이 배열이 바뀔 때마다 애니메이션 실행)
 */
export function useFlipAnimation(items: string[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevRects = useRef<Map<string, DOMRect>>(new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nextRects = new Map<string, DOMRect>();
    const elements = container.querySelectorAll<HTMLElement>('[data-flip-id]');

    elements.forEach((el) => {
      const id = el.dataset.flipId!;
      const rect = el.getBoundingClientRect();
      nextRects.set(id, rect);

      const prevRect = prevRects.current.get(id);
      if (!prevRect) return;

      const dx = prevRect.left - rect.left;
      const dy = prevRect.top - rect.top;
      if (dx === 0 && dy === 0) return;

      // 이전 위치로 즉시 이동시킨 뒤, 다음 프레임에 transform을 원위치로 되돌리며 transition으로 자연스럽게 이동
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 220ms ease';
        el.style.transform = '';
      });
    });

    prevRects.current = nextRects;
  }, [items]);

  return containerRef;
}
