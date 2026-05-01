import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Search, Check, ChevronDown } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAuthStore } from '../store/authStore';
import SchoolSearchModal from '../components/profile/SchoolSearchModal';
import type { SchoolInfo } from '../api/neisApi';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import './Login.css';

export default function Login() {
  // ✅ 모든 훅을 최상단에 선언 (React Rules of Hooks)
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMSG, setErrorMSG] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 학교 관련 상태
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [grade, setGrade] = useState('1');
  const [classNum, setClassNum] = useState('1');
  const [showSchoolSearch, setShowSchoolSearch] = useState(false);
  const [isStudent, setIsStudent] = useState(true);
  const [signupStep, setSignupStep] = useState(1); // 1: 기본정보, 2: 학교설정

  // 구글 리다이렉트 후 결과 처리
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) navigate('/');
      })
      .catch((err) => {
        if (err.code !== 'auth/no-current-user') {
          setErrorMSG(`구글 로그인 실패: ${err.message || err.code}`);
        }
      });
  }, []);

  // ✅ 훅 선언 이후에 조건부 렌더링 (올바른 순서)
  if (user) return <Navigate to="/" replace />;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMSG('');


    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged 가 user 업데이트 후 if(user) Navigate 자동 이동
      } else {
        // 회원가입 시 필수 체크
        if (isStudent && !schoolInfo) {
          setErrorMSG('학생이라면 학교를 먼저 선택해주세요!');
          return;
        }

        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });

        // 신규 유저 Firestore 문서 직접 생성 (authStore가 감지하기 전에 미리 생성하여 학교 정보 포함)
        const userRef = doc(db, 'users', userCred.user.uid);
        await setDoc(userRef, {
          id: userCred.user.uid,
          email: userCred.user.email,
          name: name,
          points: 100, // 가입 축하 포인트
          level: 1,
          role: 'user',
          isStudent: isStudent,
          schoolName: schoolInfo?.schoolName || '',
          schoolCode: schoolInfo?.schoolCode || '',
          officeCode: schoolInfo?.officeCode || '',
          grade: isStudent ? grade : '',
          class: isStudent ? classNum : '',
          created_at: Date.now()
        });
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setErrorMSG('비밀번호가 틀렸거나 없는 이메일입니다.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMSG('이미 가입된 이메일입니다.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMSG('비밀번호는 6자 이상이어야 합니다.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMSG('이메일 형식이 올바르지 않습니다.');
      } else {
        setErrorMSG(err.message || '인증 오류가 발생했습니다.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      setErrorMSG(`구글 로그인 실패: ${err.message || err.code}`);
    }
  };

  return (
    <div className="login-page">
      <div className="login-pattern-bg"></div>

      <div className={`login-card-container ${!isLogin ? 'signup-mode' : ''}`}>
        <div className="login-brand">
          <Link to="/" className="login-logo-box">
            <img src="src\assets\670483720_1443067160639588_6486915911126418629_n.png" alt="logo" width={180} height={50} ></img>
          </Link>
          <p className="login-subtitle">학생과 일반인 모두를 위한 커뮤니티 플랫폼</p>
        </div>

        <div className="login-toggle-wrap">
          <button className={`lt-btn ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>로그인</button>
          <button className={`lt-btn ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>회원가입</button>
        </div>

        <form className="login-form" onSubmit={handleAuth}>
          {errorMSG && (
            <div className="login-error-msg" style={{ color: '#FF4757', fontSize: '13px', fontWeight: 'bold' }}>
              {errorMSG}
            </div>
          )}

          {/* ── 로그인 모드 ── */}
          {isLogin && (
            <>
              <div className="input-group">
                <label>이메일</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input type="email" placeholder="email@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <div className="label-row">
                  <label>비밀번호</label>
                </div>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                  />
                </div>
              </div>

              <button type="submit" className="login-submit-btn">
                로그인하기 <ArrowRight size={18} />
              </button>
            </>
          )}

          {/* ── 회원가입 모드 (Step 1) ── */}
          {!isLogin && signupStep === 1 && (
            <div className="signup-step animate-fade-in">
              <div className="input-group">
                <label>이름 (닉네임)</label>
                <div className="input-wrapper">
                  <input type="text" placeholder="홍길동" required value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label>이메일</label>
                <div className="input-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input type="email" placeholder="email@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label>비밀번호</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} minLength={6} />
                </div>
              </div>
              <button type="button" className="login-submit-btn" onClick={() => setSignupStep(2)} disabled={!email || !password || !name}>
                다음 단계로 <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ── 회원가입 모드 (Step 2) ── */}
          {!isLogin && signupStep === 2 && (
            <div className="signup-step animate-slide-up">
              <div className="input-group">
                <label>당신은 누구인가요?</label>
                <div className="role-selector-v2">
                  <button type="button" className={`rv2-card ${isStudent ? 'active' : ''}`} onClick={() => setIsStudent(true)}>
                    <div className="rv2-icon">🎓</div>
                    <span>학생</span>
                  </button>
                  <button type="button" className={`rv2-card ${!isStudent ? 'active' : ''}`} onClick={() => setIsStudent(false)}>
                    <div className="rv2-icon">🏠</div>
                    <span>일반인</span>
                  </button>
                </div>
              </div>

              {isStudent && (
                <>
                  <div className="input-group">
                    <label>우리 학교 찾기</label>
                    <div className="school-search-box-v2" onClick={() => setShowSchoolSearch(true)}>
                      <Search size={18} />
                      <span>{schoolInfo ? schoolInfo.schoolName : '학교 이름을 검색하세요'}</span>
                      {schoolInfo && <Check size={16} className="text-primary" />}
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>학년</label>
                      <div className="custom-select-v2">
                        <select value={grade} onChange={e => setGrade(e.target.value)}>
                          {Array.from({ length: (schoolInfo?.schoolName?.includes('초등학교') ? 6 : 3) }, (_, i) => String(i + 1)).map(g => (
                            <option key={g} value={g}>{g}학년</option>
                          ))}
                        </select>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>반</label>
                      <div className="custom-select-v2">
                        <select value={classNum} onChange={e => setClassNum(e.target.value)}>
                          {Array.from({ length: 15 }, (_, i) => String(i + 1)).map(c => <option key={c} value={c}>{c}반</option>)}
                        </select>
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="lt-btn" style={{ flex: '0 0 80px', background: 'var(--bg-hover)' }} onClick={() => setSignupStep(1)}>이전</button>
                <button type="submit" className="login-submit-btn" style={{ flex: 1, margin: 0 }}>
                  가입 완료하기 <Check size={18} />
                </button>
              </div>
            </div>
          )}
        </form>


        <SchoolSearchModal
          isOpen={showSchoolSearch}
          onClose={() => setShowSchoolSearch(false)}
          onSelect={(s) => { setSchoolInfo(s); setShowSchoolSearch(false); }}
        />
      </div>
    </div>
  );
}
