import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Star, Mail, Lock, ArrowRight } from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMSG, setErrorMSG] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMSG('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/');
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        alert('가입이 완료되었습니다!');
        navigate('/');
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setErrorMSG('비밀번호가 틀렸거나 없는 이메일입니다.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMSG('이미 가입된 이메일입니다.');
      } else {
        setErrorMSG(err.message || '인증 오류가 발생했습니다.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setErrorMSG(`구글 로그인 실패: ${err.message || err.code}`);
    }
  };

  return (
    <div className="login-page">
      <div className="login-pattern-bg"></div>
      
      <div className="login-card-container animate-fade-in">
        <div className="login-brand">
          <Link to="/" className="login-logo-box">
            <Star size={28} />
          </Link>
          <h1 className="login-title">SchoolCom</h1>
          <p className="login-subtitle">우리 학교의 모든 것, 여기서 시작해볼까요?</p>
        </div>

        <div className="login-toggle-wrap">
          <button className={`lt-btn ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>로그인</button>
          <button className={`lt-btn ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>회원가입</button>
        </div>

        <form className="login-form" onSubmit={handleAuth}>
          {errorMSG && <div className="login-error-msg" style={{color: '#FF4757', fontSize: '13px', fontWeight: 'bold'}}>{errorMSG}</div>}
          
          {!isLogin && (
            <div className="input-group">
              <label>이름 (닉네임/실명)</label>
              <div className="input-wrapper">
                <input type="text" placeholder="홍길동" required value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>
          )}

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
              <input type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} minLength={6} />
            </div>
          </div>

          <button type="submit" className="login-submit-btn">
            {isLogin ? '이메일로 로그인하기' : '가입하기'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="login-divider">
          <span>또는 아주 빠르게 시작하기</span>
        </div>

        <div className="social-login-group">
          <button type="button" className="test-login-btn" style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #EAECEF', 
            background: '#fff', cursor: 'pointer', fontWeight: 'bold', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', gap: '10px'
          }} onClick={handleGoogleLogin}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.8 15.71 17.58V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.58C14.73 18.24 13.48 18.66 12 18.66C9.13 18.66 6.71 16.73 5.8 14.13H2.12V16.98C3.94 20.59 7.68 23 12 23Z" fill="#34A853"/>
              <path d="M5.8 14.13C5.57 13.43 5.44 12.73 5.44 12C5.44 11.27 5.57 10.57 5.8 9.87V7.02H2.12C1.37 8.52 0.94 10.22 0.94 12C0.94 13.78 1.37 15.48 2.12 16.98L5.8 14.13Z" fill="#FBBC05"/>
              <path d="M12 5.34C13.62 5.34 15.06 5.89 16.21 6.99L19.35 3.85C17.46 2.09 14.97 1 12 1C7.68 1 3.94 3.41 2.12 7.02L5.8 9.87C6.71 7.27 9.13 5.34 12 5.34Z" fill="#EA4335"/>
            </svg>
            구글 계정으로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
