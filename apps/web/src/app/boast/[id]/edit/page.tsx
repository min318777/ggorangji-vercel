'use client';

import { useState, useRef, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBoastPost, getPresignedUrls, uploadToS3, updateBoastPost } from '@/lib/api/posts';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGES = 10;

// 새로 추가하는 이미지 파일 정보
interface NewImageFile {
  file: File;
  previewUrl: string;
  id: string;
}

export default function BoastEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const postId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 폼 상태
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 기존 이미지 (CloudFront URL)
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  // 삭제 예정 기존 이미지 URL
  const [deletedUrls, setDeletedUrls] = useState<string[]>([]);
  // 새로 추가하는 이미지
  const [newImages, setNewImages] = useState<NewImageFile[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  // 이미지 순서 변경 드래그 상태
  const [dragExistingUrl, setDragExistingUrl] = useState<string | null>(null);
  const [dragNewImageId, setDragNewImageId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 로그인 + 게시글 소유자 확인
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const uid = localStorage.getItem('userId');
    if (!token) { router.replace('/login'); return; }

    getBoastPost(postId)
      .then((data) => {
        // 다른 사람의 글이면 상세 페이지로
        if (data.userId !== Number(uid)) {
          router.replace(`/boast/${postId}`);
          return;
        }
        setTitle(data.title);
        setContent(data.contents ?? '');
        setExistingUrls(data.imageUrls ?? []);
        setIsLoading(false);
      })
      .catch(() => {
        setLoadError('게시글을 불러오지 못했습니다.');
        setIsLoading(false);
      });
  }, [postId, router]);

  // 언마운트 시 미리보기 URL 해제
  useEffect(() => {
    return () => { newImages.forEach((img) => URL.revokeObjectURL(img.previewUrl)); };
  }, [newImages]);

  const totalImageCount = existingUrls.length - deletedUrls.length + newImages.length;

  // 기존 이미지 삭제 표시 토글
  const toggleDeleteExisting = (url: string) => {
    setDeletedUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  // 새 이미지 추가
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

  // 기존 이미지 순서 변경
  const reorderExisting = useCallback((sourceUrl: string, targetUrl: string) => {
    if (sourceUrl === targetUrl) return;
    setExistingUrls((prev) => {
      const sourceIdx = prev.findIndex((u) => u === sourceUrl);
      const targetIdx = prev.findIndex((u) => u === targetUrl);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  }, []);

  // 새 이미지 순서 변경
  const reorderNewImages = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setNewImages((prev) => {
      const sourceIdx = prev.findIndex((img) => img.id === sourceId);
      const targetIdx = prev.findIndex((img) => img.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  }, []);

  // 새 이미지 제거
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

      // 새 이미지 S3 업로드
      if (newImages.length > 0) {
        setSubmitStep('이미지 업로드 준비 중...');
        const contentTypes = newImages.map((img) => img.file.type);
        const presignedItems = await getPresignedUrls(contentTypes);

        setSubmitStep(`이미지 업로드 중...`);
        await Promise.all(
          newImages.map(async (img, idx) => uploadToS3(presignedItems[idx].presignedUrl, img.file))
        );
        newImageKeys = presignedItems.map((item) => item.key);
      }

      // 유지할 기존 이미지 URL (삭제 예정 제외)
      const keepImageUrls = existingUrls.filter((url) => !deletedUrls.includes(url));

      setSubmitStep('게시글 수정 중...');
      await updateBoastPost(postId, {
        title: title.trim(),
        content: content.trim(),
        keepImageUrls,
        newImageKeys: newImageKeys.length > 0 ? newImageKeys : undefined,
        deleteImageUrls: deletedUrls.length > 0 ? deletedUrls : undefined,
      });

      router.push(`/boast/${postId}`);
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
            <Link href={`/boast/${postId}`} className="px-6 py-3 bg-charcoal text-white rounded-full text-sm font-medium no-underline">
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
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/boast/${postId}`}
              className="flex items-center gap-1.5 text-[13px] opacity-40 hover:opacity-70 transition-opacity no-underline text-charcoal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              게시글로 돌아가기
            </Link>
          </div>
          <span className="text-[10px] uppercase tracking-[0.15em] text-brand mb-3 block font-semibold">
            Edit Post
          </span>
          <h1 className="text-3xl md:text-[40px] font-semibold tracking-[-0.04em]">
            자랑글 수정
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
                {existingUrls.map((url, i) => {
                  const isDeleted = deletedUrls.includes(url);
                  const isThumbnail = i === 0;
                  return (
                    <div
                      key={url}
                      draggable={!isDeleted}
                      onDragStart={() => setDragExistingUrl(url)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragExistingUrl) reorderExisting(dragExistingUrl, url);
                        setDragExistingUrl(null);
                      }}
                      onDragEnd={() => setDragExistingUrl(null)}
                      className={`relative aspect-square rounded-[16px] overflow-hidden group ${!isDeleted ? 'cursor-grab active:cursor-grabbing' : ''} ${dragExistingUrl === url ? 'opacity-40' : ''}`}
                    >
                      <img src={url} alt="기존 이미지" className={`w-full h-full object-cover transition-opacity ${isDeleted ? 'opacity-40' : 'opacity-100'}`} />
                      {isThumbnail && !isDeleted && (
                        <div className="absolute top-1.5 left-1.5 bg-brand text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold">썸네일</div>
                      )}
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
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => setDragNewImageId(img.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragNewImageId) reorderNewImages(dragNewImageId, img.id);
                      setDragNewImageId(null);
                    }}
                    onDragEnd={() => setDragNewImageId(null)}
                    className={`relative aspect-square rounded-[16px] overflow-hidden group cursor-grab active:cursor-grabbing ${dragNewImageId === img.id ? 'opacity-40' : ''}`}
                  >
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
            <div className="flex justify-end mt-2">
              <span className={`text-[11px] ${title.length >= 90 ? 'text-brand' : 'opacity-30'}`}>{title.length} / 100</span>
            </div>
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
              rows={8}
              className="w-full px-6 py-4 bg-white border border-black/[0.06] rounded-[20px] text-[15px] outline-none focus:border-brand transition-colors resize-none leading-relaxed"
            />
            <div className="flex justify-end mt-2">
              <span className={`text-[11px] ${content.length >= 1900 ? 'text-brand' : 'opacity-30'}`}>{content.length} / 2000</span>
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
              href={`/boast/${postId}`}
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
