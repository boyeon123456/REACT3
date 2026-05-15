import { Camera, Check, School, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import SchoolSearchModal from './SchoolSearchModal';
import type { SchoolInfo } from '../../api/neisApi';
import './ProfileModals.css';
import type { User } from '../../store/authStore';
import type { InventoryItem } from '../../types/profile';

const PROFILE_PHOTO_SELECT_MAX_BYTES = 10 * 1024 * 1024;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  badgeItems?: InventoryItem[];
  isSavingProfile: boolean;
  handleSaveProfile: (
    editName: string,
    editGrade: string,
    editClass: string,
    selectedPhotoFile: File | null,
    isStudent: boolean,
    schoolName: string,
    schoolCode: string,
    officeCode: string,
    bio: string,
    statusMessage: string,
    featuredBadgeId: string,
    handle?: string
  ) => Promise<boolean>;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
  badgeItems = [],
  isSavingProfile,
  handleSaveProfile,
  showToast,
}: EditProfileModalProps) {
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
    const timeout = window.setTimeout(() => {
      if (!isOpen) {
        setSelectedPhotoFile(null);
        setSelectedPhotoPreview('');
        return;
      }

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
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isOpen, user]);

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

  if (!isOpen) return null;

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', '이미지 파일만 업로드할 수 있어요.');
      return;
    }

    if (file.size > PROFILE_PHOTO_SELECT_MAX_BYTES) {
      showToast('error', '프로필 사진은 10MB 이하만 선택할 수 있어요.');
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
    showToast('success', `${school.schoolName}을 선택했어요.`);
  };

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

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isStudent && (!schoolName || !schoolCode)) {
      showToast('error', '학교를 먼저 선택해 주세요.');
      return;
    }

    if (isStudent && (!editGrade || !editClass)) {
      showToast('error', '학년과 반을 선택해 주세요.');
      return;
    }

    const success = await handleSaveProfile(
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

    if (success) onClose();
  };

  return (
    <>
      <div className="modal-overlay-v4" onClick={onClose}>
        <form className="modal-card-v4 edit-profile-card" onSubmit={onSave} onClick={(event) => event.stopPropagation()}>
          <button type="button" className="modal-close-v4" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>

          <div className="modal-header-v4">
            <p className="section-kicker">EDIT PROFILE</p>
            <h2>프로필 수정</h2>
            <p>이름, 아이디, 소개와 학교 정보를 간단하게 바꿀 수 있어요.</p>
          </div>

          <div className="modal-avatar-area">
            <div className="modal-avatar-preview">
              {selectedPhotoPreview ? (
                <img src={selectedPhotoPreview} alt="프로필 미리보기" />
              ) : (
                <div className="profile-avatar-fallback">{user.name?.[0] || '?'}</div>
              )}
            </div>
            <label className="upload-btn-inline" htmlFor="profile-photo-upload">
              <Camera size={16} />
              사진 선택
            </label>
            <input id="profile-photo-upload" type="file" accept="image/*" onChange={handlePhotoSelect} hidden />
          </div>

          <div className="modal-form-grid">
            <label className="field-group">
              <span>이름</span>
              <input type="text" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={15} />
            </label>

            <label className="field-group">
              <span>@아이디</span>
              <input
                type="text"
                value={handle}
                onChange={(event) => setHandle(event.target.value.toLowerCase())}
                maxLength={20}
                placeholder="예: boyeon_01"
              />
            </label>

            <label className="field-group">
              <span>상태 메시지</span>
              <input type="text" value={statusMessage} onChange={(event) => setStatusMessage(event.target.value)} maxLength={40} />
            </label>

            <label className="field-group">
              <span>소개</span>
              <input type="text" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={80} />
            </label>

            <label className="field-group">
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

            <div className="student-toggle-card">
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
              <div className="student-fields animate-fade-in">
                <div className="field-group">
                  <span>학교 설정</span>
                  <div className="school-picker-row">
                    <div className={`school-picked ${schoolName ? 'filled' : ''}`}>
                      <School size={16} />
                      <span style={{ opacity: schoolName ? 1 : 0.4 }}>{schoolName || '학교를 검색해 선택해 주세요'}</span>
                    </div>
                    <button type="button" className="school-search-btn" aria-label="학교 검색" onClick={() => setIsSchoolModalOpen(true)}>
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                <div className="field-row">
                  <label className="field-group">
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

                  <label className="field-group">
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
              </div>
            )}
          </div>

          <button type="submit" className="modal-save-btn" disabled={!isProfileChanged || isSavingProfile}>
            <Check size={18} />
            {isSavingProfile ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>

      <SchoolSearchModal isOpen={isSchoolModalOpen} onClose={() => setIsSchoolModalOpen(false)} onSelect={handleSchoolSelect} />
    </>
  );
}
