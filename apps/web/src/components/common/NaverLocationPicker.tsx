'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';

interface Props {
  lostLocation: string;
  setLostLocation: (v: string) => void;
  latitude: number | null;
  setLatitude: (v: number | null) => void;
  longitude: number | null;
  setLongitude: (v: number | null) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type N = any;

function NaverLocationPicker({
  lostLocation,
  setLostLocation,
  latitude,
  setLatitude,
  longitude,
  setLongitude,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<N>(null);
  const markerInstance = useRef<N>(null);
  const initialLatRef = useRef(latitude);
  const initialLngRef = useRef(longitude);
  const setLatitudeRef = useRef(setLatitude);
  const setLongitudeRef = useRef(setLongitude);
  const setLostLocationRef = useRef(setLostLocation);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // ref 항상 최신값 유지
  useEffect(() => { setLatitudeRef.current = setLatitude; }, [setLatitude]);
  useEffect(() => { setLongitudeRef.current = setLongitude; }, [setLongitude]);
  useEffect(() => { setLostLocationRef.current = setLostLocation; }, [setLostLocation]);

  // 좌표 → 주소 역지오코딩
  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const naver = (window as N).naver;
    if (!naver?.maps?.Service) return;
    naver.maps.Service.reverseGeocode(
      { coords: new naver.maps.LatLng(lat, lng), orders: 'roadaddr,addr' },
      (status: string, response: N) => {
        if (status !== naver.maps.Service.Status.OK) return;
        const results = response?.v2?.results ?? [];
        if (!results.length) return;
        const r = results[0];
        const land = r?.land;
        const region = r?.region;
        let addr = '';
        if (land?.name) {
          addr = `${region?.area1?.name ?? ''} ${region?.area2?.name ?? ''} ${land.name} ${land.number1 ?? ''}${land.number2 ? `-${land.number2}` : ''}`;
        } else {
          addr = `${region?.area1?.name ?? ''} ${region?.area2?.name ?? ''} ${region?.area3?.name ?? ''}`;
        }
        const trimmed = addr.replace(/\s+/g, ' ').trim();
        if (trimmed) setLostLocationRef.current(trimmed);
      }
    );
  }, []);

  // 지도 초기화
  const initMap = useCallback(() => {
    const naver = (window as N).naver;
    if (!naver?.maps || !mapRef.current || mapInstance.current) return;

    const initLat = initialLatRef.current ?? 37.5666805;
    const initLng = initialLngRef.current ?? 126.9784147;
    const center = new naver.maps.LatLng(initLat, initLng);

    const map = new naver.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      scaleControl: false,
      mapDataControl: false,
    });
    mapInstance.current = map;

    const marker = new naver.maps.Marker({
      position: center,
      map,
      draggable: true,
    });
    markerInstance.current = marker;

    // 마커 드래그로 정밀 위치 지정
    naver.maps.Event.addListener(marker, 'dragend', () => {
      const pos = marker.getPosition();
      setLatitudeRef.current(pos.lat());
      setLongitudeRef.current(pos.lng());
      reverseGeocode(pos.lat(), pos.lng());
    });

    // 지도 클릭으로 위치 지정
    naver.maps.Event.addListener(map, 'click', (e: N) => {
      const lat = e.coord.lat();
      const lng = e.coord.lng();
      marker.setPosition(new naver.maps.LatLng(lat, lng));
      setLatitudeRef.current(lat);
      setLongitudeRef.current(lng);
      reverseGeocode(lat, lng);
    });
  }, [reverseGeocode]);

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

  // naver 준비되면 지도 초기화
  useEffect(() => {
    if (!mapsLoaded) return;
    if (mapRef.current && !mapInstance.current) {
      initMap();
    }
  }, [mapsLoaded, initMap]);

  // 선택한 주소로 지도 이동
  const moveMapToAddress = useCallback((addr: string) => {
    const naver = (window as N).naver;
    if (!naver?.maps?.Service) return;

    naver.maps.Service.geocode({ query: addr }, (status: string, response: N) => {
      if (status !== naver.maps.Service.Status.OK) return;
      const result = response?.v2?.addresses?.[0];
      if (!result) return;

      const lat = Number(result.y);
      const lng = Number(result.x);
      const pos = new naver.maps.LatLng(lat, lng);

      mapInstance.current?.setCenter(pos);
      mapInstance.current?.setZoom(16);
      markerInstance.current?.setPosition(pos);

      setLatitudeRef.current(lat);
      setLongitudeRef.current(lng);
    });
  }, []);

  // 카카오 우편번호 팝업 열기
  const openPostcodePopup = useCallback(() => {
    const daum = (window as N).daum;
    if (!daum?.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    new daum.Postcode({
      oncomplete: (data: N) => {
        // 도로명 주소 우선, 없으면 지번 주소
        const addr = data.roadAddress || data.jibunAddress;
        // 상세주소(dong + detail) 포함 전체 주소
        const fullAddr = data.buildingName
          ? `${addr} (${data.buildingName})`
          : addr;

        setLostLocationRef.current(fullAddr);
        moveMapToAddress(addr);
      },
    }).open();
  }, [moveMapToAddress]);

  return (
    <div>
      {/* 주소 검색 버튼 */}
      <button
        type="button"
        onClick={openPostcodePopup}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[#F8F6F4] border border-transparent rounded-[14px] text-[13px] text-left hover:border-brand transition-colors mb-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 flex-shrink-0">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className={lostLocation ? 'text-charcoal' : 'text-black/25'}>
          {lostLocation || '주소 검색 (예: 서울역, 강남구 역삼동)'}
        </span>
      </button>

      {/* 선택된 주소 표시 */}
      {lostLocation && (
        <p className="text-[12px] text-brand font-medium mb-2 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {lostLocation}
        </p>
      )}

      {/* 지도 */}
      <div
        ref={mapRef}
        className="w-full rounded-[14px] overflow-hidden border border-black/[0.06]"
        style={{ height: 280, minWidth: 0 }}
      />
      <p className="text-[11px] opacity-40 mt-1.5">
        주소 검색 후 지도를 클릭하거나 핀을 드래그해서 위치를 정확히 지정하세요.
      </p>
    </div>
  );
}

export default memo(NaverLocationPicker);
