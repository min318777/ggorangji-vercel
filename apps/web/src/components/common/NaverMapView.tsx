'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';

interface Props {
  latitude: number;
  longitude: number;
  address?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;

function NaverMapView({ latitude, longitude, address }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<N>(null);
  const latRef = useRef(latitude);
  const lngRef = useRef(longitude);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // window.naver 준비 폴링
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      if ((window as N).naver?.maps) {
        setMapsLoaded(true);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  // 지도 초기화 — 마운트 시 한 번만
  const initMap = useCallback(() => {
    const naver = (window as N).naver;
    if (!naver?.maps || !mapRef.current || mapInstance.current) return;

    const center = new naver.maps.LatLng(latRef.current, lngRef.current);
    const map = new naver.maps.Map(mapRef.current, {
      center,
      zoom: 16,
      draggable: false,
      scrollWheel: false,
      pinchZoom: false,
      scaleControl: false,
      mapDataControl: false,
    });
    mapInstance.current = map;
    new naver.maps.Marker({ position: center, map });
  }, []);

  useEffect(() => {
    if (!mapsLoaded) return;
    if (mapRef.current && !mapInstance.current) {
      initMap();
    }
  }, [mapsLoaded, initMap]);

  // 주소 있으면 검색(핀 자동 표시), 없으면 좌표 마커
  const naverMapUrl = address
    ? `https://map.naver.com/v5/search/${encodeURIComponent(address)}`
    : `https://map.naver.com/p?c=${longitude},${latitude},17,0,0,0,dh&markers=type,1,${longitude},${latitude}`;

  return (
    <div>
      <div
        ref={mapRef}
        className="w-full rounded-[16px] overflow-hidden border border-black/[0.06]"
        style={{ height: 220 }}
      />
      <div className="flex flex-col mt-2 gap-1.5">
        {address && (
          <div className="flex items-center gap-1.5 min-w-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E8833A" strokeWidth="2" className="flex-shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-[12px] font-medium text-brand truncate">{address}</span>
          </div>
        )}
        <a
          href={naverMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start flex items-center gap-1 px-3 py-1.5 bg-[#03C75A] text-white rounded-full text-[11px] font-semibold no-underline hover:opacity-80 transition-opacity"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          네이버 지도에서 보기
        </a>
      </div>
    </div>
  );
}

export default memo(NaverMapView);
