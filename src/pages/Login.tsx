import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  GraduationCap,
  Lock,
  Mail,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import SchoolSearchModal from '../components/profile/SchoolSearchModal';
import type { SchoolInfo } from '../api/neisApi';
import { auth, db } from '../firebase';
import { getAuthErrorMessage, getFirebaseErrorCode, getProfileCreationErrorMessage } from '../lib/authErrors';
import {
  MAX_CLASS_NUMBER,
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  normalizeEmail,
  validateSignupStepOne,
  validateSignupStepTwo,
} from '../lib/signupValidation';
import { useAuthStore } from '../store/authStore';
import { defaultSettings } from '../types/profile';
import schoolyLogo from '../assets/schooly-logo-transparent.png';
import './Login.css';

type SignupStep = 1 | 2;

type InitialUserProfile = {
  id: string;
  email: string;
  name: string;
  points: number;
  level: number;
  role: 'user';
  isStudent: boolean;
  schoolName: string;
  schoolCode: string;
  officeCode: string;
  grade: string;
  class: string;
  created_at: number;
  settings: typeof defaultSettings;
  equipped_items: Record<string, string>;
};

function buildInitialUserProfile(params: {
  uid: string;
  email: string;
  name: string;
  isStudent: boolean;
  schoolInfo: SchoolInfo | null;
  grade: string;
  classNum: string;
}): InitialUserProfile {
  const trimmedName = params.name.trim();
  const normalizedEmail = normalizeEmail(params.email);

  return {
    id: params.uid,
    email: normalizedEmail,
    name: trimmedName,
    points: 100,
    level: 1,
    role: 'user',
    isStudent: params.isStudent,
    schoolName: params.isStudent ? params.schoolInfo?.schoolName || '' : '',
    schoolCode: params.isStudent ? params.schoolInfo?.schoolCode || '' : '',
    officeCode: params.isStudent ? params.schoolInfo?.officeCode || '' : '',
    grade: params.isStudent ? params.grade : '',
    class: params.isStudent ? params.classNum : '',
    created_at: Date.now(),
    settings: defaultSettings,
    equipped_items: {},
  };
}

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMSG, setErrorMSG] = useState('');
  const [stepError, setStepError] = useState('');
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [grade, setGrade] = useState('1');
  const [classNum, setClassNum] = useState('1');
  const [showSchoolSearch, setShowSchoolSearch] = useState(false);
  const [isStudent, setIsStudent] = useState(true);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          navigate('/');
        }
      })
      .catch((err: unknown) => {
        if (getFirebaseErrorCode(err) !== 'auth/no-current-user') {
          setErrorMSG('로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }
      });
  }, [navigate]);

  const gradeCount = useMemo(
    () => (schoolInfo?.schoolName?.includes('초등학교') ? 6 : 3),
    [schoolInfo?.schoolName]
  );

  if (user) return <Navigate to="/" replace />;

  const resetSignupState = () => {
    setSignupStep(1);
    setStepError('');
    setSchoolInfo(null);
    setGrade('1');
    setClassNum('1');
    setIsStudent(true);
    setIsSubmitting(false);
  };

  const clearMessages = () => {
    setErrorMSG('');
    setStepError('');
  };

  const handleToggleMode = (nextIsLogin: boolean) => {
    if (isSubmitting) return;

    setIsLogin(nextIsLogin);
    clearMessages();

    if (nextIsLogin) {
      resetSignupState();
    }
  };

  const getStepOneValidationMessage = () => {
    return validateSignupStepOne({ name, email, password });
  };

  const getStepTwoValidationMessage = () => {
    return validateSignupStepTwo({ isStudent, schoolInfo, grade, classNum, gradeCount });
  };

  const createInitialProfile = async (uid: string, profileEmail: string) => {
    const initialUserProfile = buildInitialUserProfile({
      uid,
      email: profileEmail,
      name,
      isStudent,
      schoolInfo,
      grade,
      classNum,
    });

    await setDoc(doc(db, 'users', uid), initialUserProfile);
    login(initialUserProfile);
    navigate('/', { replace: true });
  };

  const moveToSignupStepTwo = () => {
    if (isSubmitting) return;

    const validationMessage = getStepOneValidationMessage();
    if (validationMessage) {
      setStepError(validationMessage);
      return;
    }

    setStepError('');
    setSignupStep(2);
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    clearMessages();

    const normalizedEmail = normalizeEmail(email);

    if (!isLogin) {
      const stepOneError = getStepOneValidationMessage();
      if (stepOneError) {
        if (signupStep === 1) {
          setStepError(stepOneError);
        } else {
          setErrorMSG(stepOneError);
        }
        return;
      }

      if (signupStep === 1) {
        setSignupStep(2);
        return;
      }

      const stepTwoValidation = getStepTwoValidationMessage();
      if (stepTwoValidation) {
        setErrorMSG(stepTwoValidation);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
        return;
      }

      const currentAuthUser = auth.currentUser;
      const currentAuthEmail = normalizeEmail(currentAuthUser?.email || '');
      const signupAuthUser =
        currentAuthUser && currentAuthEmail === normalizedEmail
          ? currentAuthUser
          : (await createUserWithEmailAndPassword(auth, normalizedEmail, password)).user;
      const signupAuthEmail = normalizeEmail(signupAuthUser.email || '');

      if (signupAuthEmail !== normalizedEmail) {
        throw new Error('AUTH_EMAIL_MISMATCH');
      }

      try {
        await updateProfile(signupAuthUser, { displayName: name.trim() });
        await createInitialProfile(signupAuthUser.uid, signupAuthEmail);
      } catch (profileError) {
        console.error('Signup profile creation failed:', profileError);
        setErrorMSG(getProfileCreationErrorMessage(profileError));
      }
    } catch (err) {
      console.error('Auth flow failed:', err);
      setErrorMSG(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const signupProgressLabel = signupStep === 1 ? '기본 정보 입력' : '사용자 정보 선택';
  const submitDisabled = isSubmitting || !email.trim() || !password || (!isLogin && signupStep === 1 && !name.trim());

  return (
    <div className="login-page">
      <div className="login-pattern-bg" />

      <section className="login-showcase" aria-label="Schooly introduction">
        <div className="login-showcase-topline">Student, Connected.</div>
        <div className="login-showcase-logo">
          <img src={schoolyLogo} alt="Schooly" />
        </div>
        <div className="login-showcase-copy">
          <h1>오늘 학교 생활을 한눈에.</h1>
          <p>급식, 시간표, 게시판, 미니게임까지 Schooly에서 가볍게 이어가세요.</p>
        </div>
        <div className="login-showcase-stack" aria-hidden="true">
          <div className="showcase-card primary">
            <span>오늘의 급식</span>
            <strong>든든한 점심 체크</strong>
          </div>
          <div className="showcase-card">
            <span>커뮤니티</span>
            <strong>학교 이야기를 빠르게</strong>
          </div>
          <div className="showcase-card">
            <span>포인트</span>
            <strong>미니게임으로 즐겁게</strong>
          </div>
        </div>
      </section>

      <div className={`login-card-container ${!isLogin ? `signup-mode signup-step-${signupStep}` : ''}`}>
        <div className="login-brand">
          <Link to="/" className="login-logo-box">
            <strong>Schooly</strong>
          </Link>
          <p className="login-subtitle">학생과 일반 사용자 모두를 위한 학교 커뮤니티</p>
        </div>

        <div className="login-toggle-wrap" role="tablist" aria-label="인증 모드 전환">
          <button
            className={`lt-btn ${isLogin ? 'active' : ''}`}
            onClick={() => handleToggleMode(true)}
            type="button"
            disabled={isSubmitting}
          >
            로그인
          </button>
          <button
            className={`lt-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => handleToggleMode(false)}
            type="button"
            disabled={isSubmitting}
          >
            회원가입
          </button>
        </div>

        {!isLogin && (
          <section className="signup-mobile-shell" aria-label="회원가입 진행 상태">
            <div className="signup-mobile-header">
              <div>
                <p className="signup-mobile-kicker">가입 단계</p>
                <strong>{signupProgressLabel}</strong>
              </div>
              <span className="signup-mobile-count">0{signupStep} / 02</span>
            </div>

            <div className="signup-progress" aria-hidden="true">
              <span className={`signup-progress-bar ${signupStep >= 1 ? 'done' : ''}`} />
              <span className={`signup-progress-bar ${signupStep >= 2 ? 'done' : ''}`} />
            </div>
          </section>
        )}

        <form className="login-form" onSubmit={handleAuth}>
          {errorMSG && (
            <div className="login-error-msg" role="alert">
              {errorMSG}
            </div>
          )}

          {isLogin && (
            <>
              <div className="input-group">
                <label htmlFor="login-email">이메일</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="email@example.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="label-row">
                  <label htmlFor="login-password">비밀번호</label>
                </div>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="login-password"
                    type="password"
                    placeholder="비밀번호"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={PASSWORD_MIN_LENGTH}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={submitDisabled}>
                {isSubmitting ? '로그인 중...' : '로그인'} <ArrowRight size={18} />
              </button>
            </>
          )}

          {!isLogin && signupStep === 1 && (
            <div className="signup-step signup-step-one animate-fade-in">
              <div className="signup-step-copy">
                <ShieldCheck size={18} />
                <span>안전한 가입을 위해 기본 정보를 먼저 확인합니다.</span>
              </div>

              <div className="input-group">
                <label htmlFor="signup-name">이름</label>
                <div className="input-wrapper">
                  <UserRound size={18} className="input-icon" />
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="닉네임"
                    required
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setStepError('');
                    }}
                    autoComplete="nickname"
                    maxLength={NAME_MAX_LENGTH}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="signup-email">이메일</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="email@example.com"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setStepError('');
                    }}
                    autoComplete="email"
                    inputMode="email"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="signup-password">비밀번호</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="signup-password"
                    type="password"
                    placeholder="8자 이상, 이메일 아이디 포함 금지"
                    required
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setStepError('');
                    }}
                    minLength={PASSWORD_MIN_LENGTH}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                  />
                </div>
                <p className="input-hint">8자 이상, 이메일 아이디 포함 금지, 연속 공백 금지</p>
              </div>

              {stepError && (
                <div className="login-inline-msg" role="alert">
                  {stepError}
                </div>
              )}

              <div className="signup-footer">
                <button
                  type="button"
                  className="login-submit-btn signup-primary-cta"
                  onClick={moveToSignupStepTwo}
                  disabled={isSubmitting}
                >
                  다음 단계로 <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {!isLogin && signupStep === 2 && (
            <div className="signup-step signup-step-two animate-slide-up">
              <div className="signup-step-copy">
                <GraduationCap size={18} />
                <span>사용자 유형과 학교 정보를 선택하면 맞춤 기능이 바로 열립니다.</span>
              </div>

              <div className="input-group">
                <label>사용자 유형</label>
                <div className="role-selector-v2">
                  <button
                    type="button"
                    className={`rv2-card ${isStudent ? 'active' : ''}`}
                    onClick={() => setIsStudent(true)}
                    disabled={isSubmitting}
                  >
                    <div className="rv2-icon">🎓</div>
                    <strong>학생</strong>
                    <span>학교 기반 급식, 시간표, 커뮤니티 추천</span>
                  </button>
                  <button
                    type="button"
                    className={`rv2-card ${!isStudent ? 'active' : ''}`}
                    onClick={() => setIsStudent(false)}
                    disabled={isSubmitting}
                  >
                    <div className="rv2-icon">🌍</div>
                    <strong>일반 사용자</strong>
                    <span>커뮤니티와 미니게임 중심으로 바로 시작</span>
                  </button>
                </div>
              </div>

              {isStudent && (
                <>
                  <div className="input-group">
                    <label>학교 찾기</label>
                    <button
                      type="button"
                      className={`school-search-box-v2 ${schoolInfo ? 'filled' : ''}`}
                      onClick={() => setShowSchoolSearch(true)}
                      disabled={isSubmitting}
                    >
                      <div className="school-search-box-main">
                        <Search size={18} />
                        <div>
                          <strong>{schoolInfo ? schoolInfo.schoolName : '학교 검색하기'}</strong>
                          <span>
                            {schoolInfo ? '선택이 완료되었습니다. 학년과 반을 확인해 주세요.' : '학교 이름으로 검색해 주세요.'}
                          </span>
                        </div>
                      </div>
                      {schoolInfo ? <Check size={18} className="text-primary" /> : <ArrowRight size={18} />}
                    </button>
                  </div>

                  <div className="input-row">
                    <div className="input-group">
                      <label>학년</label>
                      <div className="custom-select-v2">
                        <select value={grade} onChange={(event) => setGrade(event.target.value)} disabled={isSubmitting}>
                          {Array.from({ length: gradeCount }, (_, index) => String(index + 1)).map((value) => (
                            <option key={value} value={value}>
                              {value}학년
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} />
                      </div>
                    </div>

                    <div className="input-group">
                      <label>반</label>
                      <div className="custom-select-v2">
                        <select value={classNum} onChange={(event) => setClassNum(event.target.value)} disabled={isSubmitting}>
                          {Array.from({ length: MAX_CLASS_NUMBER }, (_, index) => String(index + 1)).map((value) => (
                            <option key={value} value={value}>
                              {value}반
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="signup-footer signup-footer-dual">
                <button type="button" className="signup-secondary-btn" onClick={() => setSignupStep(1)} disabled={isSubmitting}>
                  <ArrowLeft size={16} />
                  이전
                </button>
                <button type="submit" className="login-submit-btn signup-primary-cta" disabled={isSubmitting}>
                  {isSubmitting ? '가입 처리 중...' : '가입 완료'} <Check size={18} />
                </button>
              </div>
            </div>
          )}
        </form>

        <SchoolSearchModal
          isOpen={showSchoolSearch}
          onClose={() => setShowSchoolSearch(false)}
          onSelect={(school) => {
            setSchoolInfo(school);
            setShowSchoolSearch(false);
            setErrorMSG('');
          }}
        />
      </div>
    </div>
  );
}
