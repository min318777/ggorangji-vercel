'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBar from '@/components/common/StatusBar';
import { join, checkLoginId, checkNickname } from '@/lib/api/auth';

// 폼 필드 타입 정의
interface FormData {
  loginId: string;
  nickname: string;
  password: string;
  passwordConfirm: string;
}

// 입력 필드 설정 배열 (반복 렌더링용)
const FIELDS = [
  { field: 'loginId',         label: '로그인 ID',     placeholder: '5~20자 영문/숫자',                  type: 'text' },
  { field: 'nickname',        label: '닉네임',         placeholder: '2~10자 한글/영문/숫자 (예: 김냥이123)',  type: 'text' },
  { field: 'password',        label: '비밀번호',       placeholder: '영문+숫자 필수 포함',                  type: 'password' },
  { field: 'passwordConfirm', label: '비밀번호 확인',  placeholder: '비밀번호를 다시 입력해주세요',           type: 'password' },
] as const;

export default function JoinPage() {
  const router = useRouter();

  // 폼 입력 상태
  const [formData, setFormData] = useState<FormData>({
    loginId: '',
    nickname: '',
    password: '',
    passwordConfirm: '',
  });

  // 필드별 유효성 오류 메시지
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 아이디 중복 확인 상태: null=미확인, true=사용가능, false=중복
  const [idCheckResult, setIdCheckResult] = useState<boolean | null>(null);
  const [isCheckingId, setIsCheckingId] = useState(false);

  // 닉네임 중복 확인 상태
  const [nicknameCheckResult, setNicknameCheckResult] = useState<boolean | null>(null);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);

  const handleCheckId = async () => {
    if (!/^[a-zA-Z0-9]{5,20}$/.test(formData.loginId)) {
      setErrors((prev) => ({ ...prev, loginId: '아이디는 5~20자 영문/숫자만 가능합니다.' }));
      return;
    }
    setIsCheckingId(true);
    try {
      const available = await checkLoginId(formData.loginId);
      setIdCheckResult(available);
    } catch {
      setIdCheckResult(null);
    } finally {
      setIsCheckingId(false);
    }
  };

  const handleCheckNickname = async () => {
    if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(formData.nickname)) {
      setErrors((prev) => ({ ...prev, nickname: '닉네임은 2~10자 한글/영문/숫자만 가능합니다.' }));
      return;
    }
    setIsCheckingNickname(true);
    try {
      const available = await checkNickname(formData.nickname);
      setNicknameCheckResult(available);
    } catch (e) {
      setNicknameCheckResult(null);
      setErrors((prev) => ({ ...prev, nickname: e instanceof Error ? e.message : '중복 확인 중 오류가 발생했습니다.' }));
    } finally {
      setIsCheckingNickname(false);
    }
  };

  // 클라이언트 측 유효성 검증 (백엔드와 동일한 규칙 적용)
  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!/^[a-zA-Z0-9]{5,20}$/.test(formData.loginId)) {
      newErrors.loginId = '아이디는 5~20자 영문/숫자만 가능합니다.';
    }
    if (idCheckResult !== true) {
      newErrors.loginId = '아이디 중복 확인을 완료해주세요.';
    }
    if (!/^[가-힣a-zA-Z0-9]{2,10}$/.test(formData.nickname)) {
      newErrors.nickname = '닉네임은 2~10자 한글/영문/숫자만 가능합니다.';
    } else if (nicknameCheckResult !== true) {
      newErrors.nickname = '닉네임 중복 확인을 완료해주세요.';
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]+$/.test(formData.password)) {
      newErrors.password = '영문과 숫자를 반드시 포함해야 합니다.';
    }
    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      await join(formData);
      // 회원가입 성공 → 로그인 페이지로 이동
      router.push('/login');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 필드 값 변경 핸들러 (오류 메시지 동시 초기화)
  const handleChange =
    (field: keyof FormData) => (e: ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
      // 아이디/닉네임 변경 시 중복 확인 결과 초기화
      if (field === 'loginId') setIdCheckResult(null);
      if (field === 'nickname') setNicknameCheckResult(null);
    };

  // 필드 상태에 따른 클래스 (오류/정상/기본)
  const inputClass = (field: keyof FormData) =>
    `w-full px-5 py-4 rounded-2xl text-[15px] outline-none transition-all duration-300 placeholder:text-black/30 border ${
      errors[field]
        ? 'bg-white border-red-400 shadow-[0_0_0_4px_rgba(255,77,77,0.1)]'
        : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-brand focus:shadow-[0_0_0_4px_rgba(232,131,58,0.1)]'
    }`;

  return (
    <div
      className="min-h-screen flex flex-col"
    >
      {/* 메시 그라디언트 배경 */}

      <div className="max-w-[1440px] mx-auto px-5 md:px-10 w-full flex flex-col flex-1">

        {/* 회원가입 카드 */}
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="bg-white border border-gray-100 rounded-[48px] p-10 sm:p-16 w-full max-w-[540px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative overflow-hidden">

            {/* 상단 브랜드 그라디언트 라인 */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />

            {/* 타이틀 */}
            <div className="text-center mb-12">
              <h1 className="text-[36px] sm:text-[40px] font-semibold tracking-[-0.03em] leading-[1.2] mb-3">
                가족이 되어주세요
              </h1>
              <p className="text-[15px] opacity-60 leading-relaxed">
                반려동물과의 소중한 순간을 공유하고,<br />
                안전한 커뮤니티의 일원이 되어보세요.
              </p>
            </div>

            {/* 회원가입 폼 */}
            <form onSubmit={handleSubmit}>
              {/* 서버 에러 */}
              {serverError && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
                  {serverError}
                </div>
              )}

              {/* 입력 필드들 */}
              {FIELDS.map(({ field, label, placeholder, type }) => (
                <div key={field} className="mb-6">
                  <label className="block text-[13px] font-semibold mb-2 opacity-80">{label}</label>
                  {/* 아이디/닉네임 필드: 중복 확인 버튼 포함 */}
                  {field === 'loginId' ? (
                    <div className="flex gap-2">
                      <input
                        type={type}
                        value={formData[field]}
                        onChange={handleChange(field)}
                        placeholder={placeholder}
                        autoComplete="username"
                        className={inputClass(field)}
                      />
                      <button
                        type="button"
                        onClick={handleCheckId}
                        disabled={isCheckingId}
                        className="shrink-0 px-4 py-4 rounded-2xl text-[13px] font-semibold bg-charcoal text-white hover:bg-brand transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isCheckingId ? '확인 중' : '중복 확인'}
                      </button>
                    </div>
                  ) : field === 'nickname' ? (
                    <div className="flex gap-2">
                      <input
                        type={type}
                        value={formData[field]}
                        onChange={handleChange(field)}
                        placeholder={placeholder}
                        autoComplete="off"
                        className={inputClass(field)}
                      />
                      <button
                        type="button"
                        onClick={handleCheckNickname}
                        disabled={isCheckingNickname}
                        className="shrink-0 px-4 py-4 rounded-2xl text-[13px] font-semibold bg-charcoal text-white hover:bg-brand transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isCheckingNickname ? '확인 중' : '중복 확인'}
                      </button>
                    </div>
                  ) : (
                    <input
                      type={type}
                      value={formData[field]}
                      onChange={handleChange(field)}
                      placeholder={placeholder}
                      autoComplete={
                        field === 'password' ? 'new-password'
                          : field === 'passwordConfirm' ? 'new-password'
                          : 'off'
                      }
                      className={inputClass(field)}
                    />
                  )}
                  {/* 중복 확인 결과 메시지 */}
                  {field === 'loginId' && idCheckResult !== null && (
                    <p className={`text-[11px] mt-2 ${idCheckResult ? 'text-green-500' : 'text-red-500'}`}>
                      {idCheckResult ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.'}
                    </p>
                  )}
                  {field === 'nickname' && nicknameCheckResult !== null && (
                    <p className={`text-[11px] mt-2 ${nicknameCheckResult ? 'text-green-500' : 'text-red-500'}`}>
                      {nicknameCheckResult ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.'}
                    </p>
                  )}
                  {/* 유효성 오류 메시지 */}
                  {errors[field] && (
                    <p className="text-[11px] text-red-500 mt-2">{errors[field]}</p>
                  )}
                </div>
              ))}

              {/* 가입 완료 버튼 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-charcoal text-white py-5 rounded-full text-base font-semibold flex justify-center items-center gap-3 mt-4 hover:bg-brand hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(232,131,58,0.2)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  '가입 처리 중...'
                ) : (
                  <>
                    가입 완료하기
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* 로그인 링크 */}
            <div className="mt-8 text-center text-[14px] opacity-60">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-brand font-semibold no-underline hover:underline">
                로그인하기
              </Link>
            </div>
          </div>
        </div>
      </div>

      <StatusBar text="AUTH_SERVICE_READY // PROD_NODE_04" />
    </div>
  );
}
