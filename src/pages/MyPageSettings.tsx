import { Camera, Check, ChevronLeft, School, Search } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import SchoolSearchModal from '../components/profile/SchoolSearchModal';
import type { SchoolInfo } from '../api/neisApi';
import { useInventory } from '../hooks/useInventory';
import { useProfile } from '../hooks/useProfile';
import { useProfileActions } from '../hooks/useProfileActions';
import './MyPage.css';

const PROFILE_PHOTO_SELECT_MAX_BYTES = 10 * 1024 * 1024;

export default function MyPageSettings() {
  const navigate = useNavigate();
  const { user } = useProfile();
  const { badgeItems } = useInventory();
  const actions = useProfileActions();

  const [editName, setEditName] = useState('');
  const [handle, setHandle] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editClass, setEditClass] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [officeCode, setOfficeCode] = useState('');
  const [bio, setBio] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [featuredBadgeId, setFeaturedBadgeId] = useState('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState('');
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const timeout = window.setTimeout(() => {
      setEditName(user.name || '');
      setHandle(user.handle || '');
      setEditGrade(user.grade || '');
      setEditClass(user.class || '');
      setIsStudent(user.isStudent || false);
      setSchoolName(user.schoolName || '');
      setSchoolCode(user.schoolCode || '');
      setOfficeCode(user.officeCode || '');
      setBio(user.bio || '');
      setStatusMessage(user.statusMessage || '');
      setFeaturedBadgeId(user.featuredBadgeId || '');
      setSelectedPhotoPreview(user.photoURL || '');
      setSelectedPhotoFile(null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [user]);

  useEffect(() => {
    return () => {
      if (selectedPhotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedPhotoPreview);
      }
    };
  }, [selectedPhotoPreview]);

  const gradeOptions = useMemo(
    () => Array.from({ length: schoolName.includes('초등학교') ? 6 : 3 }, (_, index) => index + 1),
    [schoolName]
  );

  if (!user) {
    return (
      <div className="mypage-v6 profile-settings-page animate-fade-in">
        <div className="profile-settings-shell">
          <p className="profile-settings-empty">로그인이 필요해요.</p>
        </div>
      </div>
    );
  }

  const normalizedHandle = handle.trim().toLowerCase().replace(/^@+/, '');
  const normalizedGrade = isStudent ? editGrade : '';
  const normalizedClass = isStudent ? editClass : '';
  const normalizedSchoolName = isStudent ? schoolName : '';
  const normalizedSchoolCode = isStudent ? schoolCode : '';
  const normalizedOfficeCode = isStudent ? officeCode : '';

  const isProfileChanged =
    editName.trim() !== user.name ||
    normalizedHandle !== (user.handle || '') ||
    normalizedGrade !== (user.grade || '') ||
    normalizedClass !== (user.class || '') ||
    isStudent !== (user.isStudent || false) ||
    normalizedSchoolName !== (user.schoolName || '') ||
    normalizedSchoolCode !== (user.schoolCode || '') ||
    normalizedOfficeCode !== (user.officeCode || '') ||
    bio !== (user.bio || '') ||
    statusMessage !== (user.statusMessage || '') ||
    featuredBadgeId !== (user.featuredBadgeId || '') ||
    Boolean(user.profileStyle && Object.keys(user.profileStyle).length > 0) ||
    Boolean(selectedPhotoFile);

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      actions.showToast('error', '이미지 파일만 업로드할 수 있어요.');
      return;
    }

    if (file.size > PROFILE_PHOTO_SELECT_MAX_BYTES) {
      actions.showToast('error', '프로필 사진은 10MB 이하만 선택할 수 있어요.');
      return;
    }

    if (selectedPhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedPhotoPreview);
    }

    setSelectedPhotoFile(file);
    setSelectedPhotoPreview(URL.createObjectURL(file));
  };

  const handleSchoolSelect = (school: SchoolInfo) => {
    setSchoolName(school.schoolName);
    setSchoolCode(school.schoolCode);
    setOfficeCode(school.officeCode);
    setIsSchoolModalOpen(false);
    actions.showToast('success', `${school.schoolName}을 선택했어요.`);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isStudent && (!schoolName || !schoolCode)) {
      actions.showToast('error', '학교를 먼저 선택해 주세요.');
      return;
    }

    if (isStudent && (!editGrade || !editClass)) {
      actions.showToast('error', '학년과 반을 선택해 주세요.');
      return;
    }

    const success = await actions.handleSaveProfile(
      editName,
      normalizedGrade,
      normalizedClass,
      selectedPhotoFile,
      isStudent,
      normalizedSchoolName,
      normalizedSchoolCode,
      normalizedOfficeCode,
      bio,
      statusMessage,
      featuredBadgeId,
      normalizedHandle
    );

    if (success) navigate('/mypage');
  };

  return (
    <div className="mypage-v6 profile-settings-page animate-fade-in">
      <form className="profile-settings-shell" onSubmit={handleSubmit}>
        <div className="profile-settings-header">
          <button type="button" className="settings-back-btn" onClick={() => navigate('/mypage')} aria-label="프로필로 돌아가기">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1>프로필 설정</h1>
            <p>이름, 아이디, 소개와 학교 정보를 바꿔요.</p>
          </div>
        </div>

        <section className="settings-profile-strip">
          <div className="settings-avatar-preview">
            {selectedPhotoPreview ? <img src={selectedPhotoPreview} alt="" /> : <span>{user.name?.[0] || '?'}</span>}
          </div>
          <label className="settings-photo-btn" htmlFor="profile-settings-photo">
            <Camera size={16} />
            사진 선택
          </label>
          <input id="profile-settings-photo" type="file" accept="image/*" onChange={handlePhotoSelect} hidden />
        </section>

        <section className="settings-form-grid">
          <label className="settings-field">
            <span>이름</span>
            <input type="text" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={15} />
          </label>

          <label className="settings-field">
            <span>@아이디</span>
            <input
              type="text"
              value={handle}
              onChange={(event) => setHandle(event.target.value.toLowerCase())}
              maxLength={20}
              placeholder="예: boyeon_01"
            />
          </label>

          <label className="settings-field">
            <span>상태 메시지</span>
            <input type="text" value={statusMessage} onChange={(event) => setStatusMessage(event.target.value)} maxLength={40} />
          </label>

          <label className="settings-field">
            <span>소개</span>
            <input type="text" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={80} />
          </label>

          <label className="settings-field">
            <span>대표 배지</span>
            <select value={featuredBadgeId} onChange={(event) => setFeaturedBadgeId(event.target.value)}>
              <option value="">선택 안 함</option>
              {badgeItems.map((badge) => (
                <option key={badge.id} value={badge.id}>
                  {badge.name}
                </option>
              ))}
            </select>
          </label>

          <div className="settings-student-toggle">
            <div>
              <strong>학생 프로필</strong>
              <span>학교 정보는 시간표와 급식 기능에 사용돼요.</span>
            </div>
            <label className="switch-v2" aria-label="학생 프로필 사용">
              <input type="checkbox" checked={isStudent} onChange={(event) => setIsStudent(event.target.checked)} />
              <span className="slider-v2"></span>
            </label>
          </div>

          {isStudent && (
            <div className="settings-school-grid">
              <div className="settings-field settings-school-field">
                <span>학교 설정</span>
                <div className="settings-school-row">
                  <div className={`settings-school-picked ${schoolName ? 'filled' : ''}`}>
                    <School size={16} />
                    <span>{schoolName || '학교를 검색해 선택해 주세요'}</span>
                  </div>
                  <button type="button" className="settings-search-btn" aria-label="학교 검색" onClick={() => setIsSchoolModalOpen(true)}>
                    <Search size={16} />
                  </button>
                </div>
              </div>

              <label className="settings-field">
                <span>학년</span>
                <select value={editGrade} onChange={(event) => setEditGrade(event.target.value)}>
                  <option value="">선택</option>
                  {gradeOptions.map((value) => (
                    <option key={value} value={String(value)}>
                      {value}학년
                    </option>
                  ))}
                </select>
              </label>

              <label className="settings-field">
                <span>반</span>
                <select value={editClass} onChange={(event) => setEditClass(event.target.value)}>
                  <option value="">선택</option>
                  {Array.from({ length: 15 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={String(value)}>
                      {value}반
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </section>

        <div className="profile-settings-actions">
          <button type="button" className="settings-cancel-btn" onClick={() => navigate('/mypage')}>
            취소
          </button>
          <button type="submit" className="settings-save-btn" disabled={!isProfileChanged || actions.isSavingProfile}>
            <Check size={18} />
            {actions.isSavingProfile ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>

      <SchoolSearchModal isOpen={isSchoolModalOpen} onClose={() => setIsSchoolModalOpen(false)} onSelect={handleSchoolSelect} />
      {actions.toast && <div className={`mypage-toast ${actions.toast.type}`}>{actions.toast.message}</div>}
    </div>
  );
}
