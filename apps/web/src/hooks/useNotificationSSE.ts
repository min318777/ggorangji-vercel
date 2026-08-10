'use client';

import { useEffect, useRef } from 'react';
import type { NotificationItem } from '@/lib/api/notification';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
const RECONNECT_DELAY_MS = 3000;

interface UseNotificationSSEProps {
  isLoggedIn: boolean;
  onNotification: (noti: NotificationItem) => void;
}

// fetch 기반 SSE 훅 — EventSource는 Authorization 헤더 불가
export function useNotificationSSE({ isLoggedIn, onNotification }: UseNotificationSSEProps) {
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  useEffect(() => {
    if (!isLoggedIn) return;

    let abortController = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let lastEventId = ''; // 마지막 수신 알림 ID — 재연결 시 누락 알림 복구용

    async function connect() {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      try {
        const res = await fetch(`${BASE_URL}/api/notifications/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            // 재연결 시 마지막 수신 ID 전송 → 서버가 누락 알림 재전송
            ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {}),
          },
          signal: abortController.signal,
        });

        if (!res.ok || !res.body) {
          // 401은 토큰 만료 — 재연결해도 의미없으므로 중단
          if (res.status === 401) return;
          scheduleReconnect();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // SSE 스트림 파싱: "id: X\nevent: Y\ndata: Z\n\n" 형식
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() ?? '';

          for (const block of blocks) {
            if (!block.trim()) continue;

            let eventId = '';
            let eventName = '';
            let dataLine = '';

            for (const line of block.split('\n')) {
              if (line.startsWith('id:')) eventId = line.slice(3).trim();
              if (line.startsWith('event:')) eventName = line.slice(6).trim();
              if (line.startsWith('data:')) dataLine = line.slice(5).trim();
            }

            // 이벤트 ID 갱신 (heartbeat, connect 제외한 실제 알림만)
            if (eventId && eventName === 'notification') lastEventId = eventId;

            // heartbeat/connect 이벤트 무시
            if (eventName === 'heartbeat' || eventName === 'connect') continue;

            if (eventName === 'notification' && dataLine) {
              try {
                const noti = JSON.parse(dataLine) as NotificationItem;
                onNotificationRef.current(noti);
              } catch {
                // JSON 파싱 실패 무시
              }
            }
          }
        }

        // 스트림 정상 종료 시 재연결
        scheduleReconnect();
      } catch (e: unknown) {
        // AbortError는 로그아웃/언마운트 시 의도적 중단 → 재연결 안 함
        if (e instanceof Error && e.name === 'AbortError') return;
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      if (stopped) return;
      reconnectTimer = setTimeout(() => {
        abortController = new AbortController();
        connect();
      }, RECONNECT_DELAY_MS);
    }

    connect();

    return () => {
      stopped = true;
      abortController.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [isLoggedIn]);
}
