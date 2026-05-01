import { useState } from 'react';
import { School, GraduationCap, Users, ChevronRight, X, Globe } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import SchoolSearchModal from './SchoolSearchModal';
import type { SchoolInfo } from '../../api/neisApi';
import './OnboardingModal.css';

export default function OnboardingModal() {
  const { user, patchUser } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [grade, setGrade] = useState('1');
  const [classNum, setClassNum] = useState('1');
  const [showSchoolSearch, setShowSchoolSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelectRole = (student: boolean) => {
    setIsStudent(student);
    setStep(2);
  };

  const handleSelectSchool = (school: SchoolInfo) => {
    setSchoolInfo(school);
    setShowSchoolSearch(false);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = { isStudent };
      if (isStudent && schoolInfo) {
        updates.schoolName = schoolInfo.schoolName;
        updates.schoolCode = schoolInfo.schoolCode;
        updates.officeCode = schoolInfo.officeCode;
        updates.grade = grade;
        updates.class = classNum;
      }
      await updateDoc(doc(db, 'users', user.id), updates);
      patchUser(updates);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {};

  return (
    <>
      <div className="onboarding-overlay">
        <div className="onboarding-card animate-fade-in">

          {/* 건너뛰기 */}
          <button className="onboarding-skip" onClick={handleSkip}>
            <X size={18} />
          </button>

          {/* 스텝 인디케이터 */}
          <div className="onboarding-steps">
            <div className={`ob-step ${step >= 1 ? 'done' : ''}`} />
            <div className={`ob-step ${step >= 2 ? 'done' : ''}`} />
          </div>

          {step === 1 && (
            <div className="onboarding-body">
              <div className="ob-icon-wrap">
                <GraduationCap size={40} />
              </div>
              <h2 className="ob-title">
                {user?.name ? `${user.name}님, 반가워요!` : '반가워요!'}
              </h2>
              <p className="ob-desc">
                어떻게 이용하실 건가요?<br />
                맞춤 정보를 보여드릴게요.
              </p>

              <div className="ob-role-cards">
                <button className="ob-role-card" onClick={() => handleSelectRole(true)}>
                  <div className="ob-role-icon student">
                    <School size={28} />
                  </div>
                  <div className="ob-role-text">
                    <strong>학생이에요</strong>
                    <span>급식·시간표·우리 학교 게시판</span>
                  </div>
                  <ChevronRight size={18} className="ob-role-arrow" />
                </button>
                <button className="ob-role-card" onClick={() => handleSelectRole(false)}>
                  <div className="ob-role-icon general">
                    <Globe size={28} />
                  </div>
                  <div className="ob-role-text">
                    <strong>일반 유저예요</strong>
                    <span>커뮤니티·미니게임·포인트 상점</span>
                  </div>
                  <ChevronRight size={18} className="ob-role-arrow" />
                </button>
              </div>

              <button className="ob-skip-text" onClick={handleSkip}>나중에 설정할게요</button>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-body">
              {isStudent ? (
                <>
                  <div className="ob-icon-wrap">
                    <School size={40} />
                  </div>
                  <h2 className="ob-title">학교 정보를 알려주세요</h2>
                  <p className="ob-desc">실시간 급식·시간표와 우리 학교 게시판을 이용할 수 있어요.</p>

                  {/* 학교 검색 */}
                  <button
                    className={`ob-school-btn ${schoolInfo ? 'selected' : ''}`}
                    onClick={() => setShowSchoolSearch(true)}
                  >
                    <School size={18} />
                    {schoolInfo ? schoolInfo.schoolName : '학교 검색하기'}
                    {schoolInfo && <span className="ob-check">✓</span>}
                  </button>

                  {schoolInfo && (
                    <div className="ob-grade-class">
                      <div className="ob-select-wrap">
                        <label>학년</label>
                        <select value={grade} onChange={e => setGrade(e.target.value)}>
                          {Array.from({ length: (schoolInfo?.schoolName?.includes('초등학교') ? 6 : 3) }, (_, i) => String(i + 1)).map(c =>
                            <option key={c} value={c}>{c}반</option>
                          )}
                        </select>
                      </div>
                    </div>
                  )}

                  <button
                    className={`ob-finish-btn ${saving ? 'loading' : ''}`}
                    onClick={handleFinish}
                    disabled={saving}
                  >
                    {saving ? '저장 중...' : schoolInfo ? '완료하기 🎉' : '학교 없이 시작하기'}
                  </button>
                </>
              ) : (
                <>
                  <div className="ob-icon-wrap">
                    <Users size={40} />
                  </div>
                  <h2 className="ob-title">준비 완료!</h2>
                  <p className="ob-desc">
                    커뮤니티, 미니게임, 포인트 상점을 자유롭게 이용하세요.<br />
                    나중에 학생으로 전환할 수도 있어요.
                  </p>
                  <button className="ob-finish-btn" onClick={handleFinish} disabled={saving}>
                    {saving ? '저장 중...' : '시작하기 🚀'}
                  </button>
                </>
              )}

              <button className="ob-skip-text" onClick={() => setStep(1)}>← 돌아가기</button>
            </div>
          )}
        </div>
      </div>

      <SchoolSearchModal
        isOpen={showSchoolSearch}
        onClose={() => setShowSchoolSearch(false)}
        onSelect={handleSelectSchool}
      />
    </>
  );
}
