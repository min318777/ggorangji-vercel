'use client';

import { useState, useRef, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NaverLocationPicker from '@/components/common/NaverLocationPicker';
import { getLostPost, getPresignedUrls, uploadToS3, updateLostPost } from '@/lib/api/posts';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGES = 10;

interface NewImageFile {
  file: File;
  previewUrl: string;
  id: string;
}

export default function LostEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const postId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 공통 필드
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 실종글 전용 필드
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('');
  const [catColor, setCatColor] = useState('');
  const [catAge, setCatAge] = useState('');
  const [catWeight, setCatWeight] = useState('');
  const [catGender, setCatGender] = useState('');
  const [lostDate, setLostDate] = useState('');
  const [lostLocation, setLostLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  // 이미지
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [deletedUrls, setDeletedUrls] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImageFile[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 로그인 + 소유자 확인
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const uid = localStorage.getItem('userId');
    if (!token) { router.replace('/login'); return; }

    getLostPost(postId)
      .then((data) => {
        if (data.userId !== Number(uid)) {
          router.replace(`/lost/${postId}`);
          return;
        }
        setTitle(data.title);
        setContent(data.content ?? '');
        setCatName(data.catName ?? '');
        setCatType(data.catType ?? '');
        setCatColor(data.catColor ?? '');
        setCatAge(data.catAge != null ? String(data.catAge) : '');
        setCatWeight(data.catWeight != null ? String(data.catWeight) : '');
        setCatGender(data.catGender ?? '');
        setLostDate(data.lostDate ? data.lostDate.substring(0, 10) : '');
        setLostLocation(data.lostLocation ?? '');
        setLatitude(data.latitude ?? null);
        setLongitude(data.longitude ?? null);
        setIsCompleted(data.completed);
        setExistingUrls(data.imageUrls ?? []);
        setIsLoading(false);
      })
      .catch(() => {
        setLoadError('게시글을 불러오지 못했습니다.');
        setIsLoading(false);
      });
  }, [postId, router]);

  useEffect(() => {
    return () => { newImages.forEach((img) => URL.revokeObjectURL(img.previewUrl)); };
  }, [newImages]);

  const totalImageCount = existingUrls.length - deletedUrls.length + newImages.length;

  const toggleDeleteExisting = (url: string) => {
    setDeletedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files).filter((f) => ALLOWED_TYPES.includes(f.type));
    setNewImages((prev) => {
      const remaining = MAX_IMAGES - totalImageCount;
      if (remaining <= 0) { setError(`이미지는 최대 ${MAX_IMAGES}장까지 가능합니다.`); return prev; }
      const toAdd = fileArr.slice(0, remaining).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        id: `${Date.now()}-${Math.random()}`,
      }));
      return [...prev, ...toAdd];
    });
    setError('');
  }, [totalImageCount]);

  const removeNewImage = useCallback((imgId: string) => {
    setNewImages((prev) => {
      const target = prev.find((img) => img.id === imgId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== imgId);
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const validate = (): string => {
    if (!title.trim()) return '제목을 입력해 주세요.';
    if (title.trim().length < 2) return '제목은 2자 이상 입력해 주세요.';
    if (title.trim().length > 100) return '제목은 100자 이하로 입력해 주세요.';
    if (content.length > 2000) return '내용은 2000자 이하로 입력해 주세요.';
    if (catAge && (isNaN(Number(catAge)) || Number(catAge) < 0 || Number(catAge) > 30)) return '나이는 0~30 사이로 입력해 주세요.';
    if (catWeight && (isNaN(Number(catWeight)) || Number(catWeight) < 0 || Number(catWeight) > 30)) return '몸무게는 0~30kg 사이로 입력해 주세요.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setIsSubmitting(true);
    setError('');

    try {
      let newImageKeys: string[] = [];

      if (newImages.length > 0) {
        setSubmitStep('이미지 업로드 준비 중...');
        const contentTypes = newImages.map((img) => img.file.type);
        const presignedItems = await getPresignedUrls(contentTypes);
        setSubmitStep('이미지 업로드 중...');
        await Promise.all(
          newImages.map(async (img, idx) => uploadToS3(presignedItems[idx].presignedUrl, img.file))
        );
        newImageKeys = presignedItems.map((item) => item.key);
      }

      const keepImageUrls = existingUrls.filter((url) => !deletedUrls.includes(url));

      setSubmitStep('게시글 수정 중...');
      await updateLostPost(postId, {
        title: title.trim(),
        content: content.trim(),
        catName: catName.trim() || undefined,
        catType: catType.trim() || undefined,
        catColor: catColor.trim() || undefined,
        catAge: catAge ? Number(catAge) : undefined,
        catWeight: catWeight ? Number(catWeight) : undefined,
        catGender: catGender || undefined,
        lostDate: lostDate || undefined,
        lostLocation: lostLocation.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        isCompleted,
        keepImageUrls,
        newImageKeys: newImageKeys.length > 0 ? newImageKeys : undefined,
        deleteImageUrls: deletedUrls.length > 0 ? deletedUrls : undefined,
      });

      router.push(`/lost/${postId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
      setSubmitStep('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10">
          <div className="flex items-center justify-center py-40">
            <svg className="animate-spin w-8 h-8 text-brand" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1440px] mx-auto px-5 md:px-10">
          <div className="py-40 text-center">
            <p className="text-red-500 mb-4">{loadError}</p>
            <Link href={`/lost/${postId}`} className="px-6 py-3 bg-charcoal text-white rounded-full text-sm font-medium no-underline">
              돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      <div className="max-w-[1440px] mx-auto px-5 md:px-10">

        <section className="pt-10 md:pt-[60px] pb-8">
          <Link
            href={`/lost/${postId}`}
            className="flex items-center gap-1.5 text-[13px] opacity-40 hover:opacity-70 transition-opacity no-underline text-charcoal mb-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            게시글로 돌아가기
          </Link>
          <span className="text-[10px] uppercase tracking-[0.15em] text-brand mb-3 block font-semibold">
            Edit Post
          </span>
          <h1 className="text-3xl md:text-[40px] font-semibold tracking-[-0.04em]">
            실종 신고 수정
          </h1>
        </section>

        <form onSubmit={handleSubmit} className="max-w-[800px] pb-24">

          {/* 이미지 관리 */}
          <div className="mb-8">
            <label className="block text-[13px] font-semibold text-charcoal mb-3">
              사진 <span className="font-normal opacity-40">(선택 · 최대 {MAX_IMAGES}장)</span>
            </label>

            {/* 드래그 앤 드롭 존 */}
            {totalImageCount < MAX_IMAGES && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-[160px] rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
                  isDragging ? 'border-brand bg-brand/5 scale-[1.01]' : 'border-black/10 bg-white/50 hover:border-brand/50 hover:bg-white/80'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8833A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-medium text-charcoal/60">클릭하거나 사진을 여기에 끌어다 놓으세요</p>
                  <p className="text-[11px] opacity-40 mt-1">jpg, png, gif, webp · 최대 {MAX_IMAGES}장</p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            />

            {/* 이미지 미리보기 그리드 (기존 + 새 이미지 통합) */}
            {(existingUrls.length > 0 || newImages.length > 0) && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-3">
                {/* 기존 이미지 */}
                {existingUrls.map((url) => {
                  const isDeleted = deletedUrls.includes(url);
                  return (
                    <div key={url} className="relative aspect-square rounded-[16px] overflow-hidden group">
                      <img src={url} alt="기존 이미지" className={`w-full h-full object-cover transition-opacity ${isDeleted ? 'opacity-40' : 'opacity-100'}`} />
                      {isDeleted && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="text-white text-[10px] font-bold">삭제 예정</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleDeleteExisting(url)}
                        className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                          isDeleted ? 'bg-green-500 text-white' : 'bg-black/60 text-white hover:bg-red-500'
                        }`}
                      >
                        {isDeleted ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        )}
                      </button>
                    </div>
                  );
                })}

                {/* 새 이미지 */}
                {newImages.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-[16px] overflow-hidden group">
                    <img src={img.previewUrl} alt="미리보기" className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 bg-brand text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold">NEW</div>
                    <button
                      type="button"
                      onClick={() => removeNewImage(img.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* 그리드 내 추가 버튼 */}
                {totalImageCount < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-[16px] border-2 border-dashed border-black/10 flex items-center justify-center hover:border-brand/50 hover:bg-brand/5 transition-all duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-30">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 제목 */}
          <div className="mb-6">
            <label className="block text-[13px] font-semibold text-charcoal mb-3">
              제목 <span className="text-brand">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="w-full px-6 py-4 bg-white border border-black/[0.06] rounded-[20px] text-[15px] outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* 내용 */}
          <div className="mb-8">
            <label className="block text-[13px] font-semibold text-charcoal mb-3">
              내용 <span className="font-normal opacity-40">(선택 · 최대 2000자)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={6}
              className="w-full px-6 py-4 bg-white border border-black/[0.06] rounded-[20px] text-[15px] outline-none focus:border-brand transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* 실종 고양이 정보 */}
          <div className="bg-white rounded-[28px] p-6 mb-8 border border-black/[0.04]">
            <span className="text-[10px] uppercase tracking-[0.15em] text-brand mb-5 block font-semibold">
              실종 고양이 정보
            </span>

            {/* 2열 그리드 필드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {[
                { label: '이름', value: catName, setter: setCatName, placeholder: '예: 나비', maxLength: 20 },
                { label: '품종', value: catType, setter: setCatType, placeholder: '예: 코리안숏헤어', maxLength: 30 },
                { label: '색상', value: catColor, setter: setCatColor, placeholder: '예: 치즈색', maxLength: 20 },
              ].map(({ label, value, setter, placeholder, maxLength }) => (
                <div key={label}>
                  <label className="block text-[12px] font-semibold text-charcoal/60 mb-2">{label}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className="w-full px-4 py-3 bg-[#F8F6F4] border border-transparent rounded-[14px] text-[14px] outline-none focus:border-brand transition-colors"
                  />
                </div>
              ))}

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/60 mb-2">나이 (살)</label>
                <input
                  type="number"
                  value={catAge}
                  onChange={(e) => setCatAge(e.target.value)}
                  placeholder="예: 3"
                  min={0}
                  max={30}
                  className="w-full px-4 py-3 bg-[#F8F6F4] border border-transparent rounded-[14px] text-[14px] outline-none focus:border-brand transition-colors"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/60 mb-2">몸무게 (kg)</label>
                <input
                  type="number"
                  value={catWeight}
                  onChange={(e) => setCatWeight(e.target.value)}
                  placeholder="예: 4"
                  min={0}
                  max={30}
                  className="w-full px-4 py-3 bg-[#F8F6F4] border border-transparent rounded-[14px] text-[14px] outline-none focus:border-brand transition-colors"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/60 mb-2">성별</label>
                <select
                  value={catGender}
                  onChange={(e) => setCatGender(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F8F6F4] border border-transparent rounded-[14px] text-[14px] outline-none focus:border-brand transition-colors"
                >
                  <option value="">선택 안 함</option>
                  <option value="MALE">수컷</option>
                  <option value="FEMALE">암컷</option>
                  <option value="UNKNOWN">모름</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-charcoal/60 mb-2">실종일자</label>
                <input
                  type="date"
                  value={lostDate}
                  onChange={(e) => setLostDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F8F6F4] border border-transparent rounded-[14px] text-[14px] outline-none focus:border-brand transition-colors"
                />
              </div>
            </div>

            {/* 실종 위치 — 네이버 지도 선택 */}
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-charcoal/60 mb-2">실종 위치</label>
              <NaverLocationPicker
                lostLocation={lostLocation}
                setLostLocation={setLostLocation}
                latitude={latitude}
                setLatitude={setLatitude}
                longitude={longitude}
                setLongitude={setLongitude}
              />
            </div>


            {/* 귀가 완료 여부 */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCompleted((prev) => !prev)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 border-none cursor-pointer ${
                  isCompleted ? 'bg-emerald-500' : 'bg-black/15'
                }`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isCompleted ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-[13px] font-medium">
                {isCompleted ? '귀가 완료 (찾았어요!)' : '아직 찾는 중'}
              </span>
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <div className="mb-6 px-5 py-4 bg-red-50 border border-red-100 rounded-[16px] flex items-start gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex items-center gap-4">
            <Link
              href={`/lost/${postId}`}
              className="px-8 py-4 bg-white border border-black/[0.06] rounded-full text-[14px] font-medium text-charcoal no-underline hover:bg-black/5 transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-10 py-4 bg-charcoal text-white rounded-full text-[14px] font-semibold hover:bg-gray-800 transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {submitStep || '수정 중...'}
                </>
              ) : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
