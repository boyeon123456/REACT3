import { Camera, Check, X, School, Search } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import SchoolSearchModal from './SchoolSearchModal';
import type { SchoolInfo } from '../../api/neisApi';
import './ProfileModals.css';

import type { User } from '../../store/authStore';

const PROFILE_PHOTO_SELECT_MAX_BYTES = 10 * 1024 * 1024;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  isSavingProfile: boolean;
  handleSaveProfile: (
    editName: string,
    editGrade: string,
    editClass: string,
    selectedPhotoFile: File | null,
    isStudent: boolean,
    schoolName: string,
    schoolCode: string,
    officeCode: string
  ) => Promise<boolean>;
  showToast: (type: 'success' | 'error', message: string) => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
  isSavingProfile,
  handleSaveProfile,
  showToast,
}: EditProfileModalProps) {
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editClass, setEditClass] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [officeCode, setOfficeCode] = useState('');

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState('');
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditName(user.name || '');
      setEditGrade(user.grade || '');
      setEditClass(user.class || '');
      setIsStudent(user.isStudent || false);
      setSchoolName(user.schoolName || '');
      setSchoolCode(user.schoolCode || '');
      setOfficeCode(user.officeCode || '');
      setSelectedPhotoPreview(user.photoURL || '');
    } else {
      setSelectedPhotoFile(null);
      setSelectedPhotoPreview('');
    }
  }, [isOpen, user]);

  useEffect(() => {
    return () => {
      if (selectedPhotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(selectedPhotoPreview);
      }
    };
  }, [selectedPhotoPreview]);

  if (!isOpen || !user) return null;

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', '이미지 파일만 업로드할 수 있어요.');
      return;
    }

    if (file.size > PROFILE_PHOTO_SELECT_MAX_BYTES) {
      showToast('error', '프로필 사진은 10MB 이하만 선택할 수 있어요. 저장할 때 자동 압축됩니다.');
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
    showToast('success', `${school.schoolName}이(가) 선택되었습니다.`);
  };

  const normalizedGrade = isStudent ? editGrade : '';
  const normalizedClass = isStudent ? editClass : '';
  const normalizedSchoolName = isStudent ? schoolName : '';
  const normalizedSchoolCode = isStudent ? schoolCode : '';
  const normalizedOfficeCode = isStudent ? officeCode : '';
  const gradeOptions = Array.from({ length: schoolName.includes('초등학교') ? 6 : 3 }, (_, index) => index + 1);

  const isProfileChanged =
    editName.trim() !== user.name ||
    normalizedGrade !== (user.grade || '') ||
    normalizedClass !== (user.class || '') ||
    isStudent !== (user.isStudent || false) ||
    normalizedSchoolName !== (user.schoolName || '') ||
    normalizedSchoolCode !== (user.schoolCode || '') ||
    normalizedOfficeCode !== (user.officeCode || '') ||
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
      normalizedOfficeCode
    );
    if (success) {
      onClose();
    }
  };

  return (
    <>
      <div className="modal-overlay-v4" onClick={onClose}>
        <form className="modal-card-v4 edit-profile-card" onSubmit={onSave} onClick={(event) => event.stopPropagation()}>
          <button type="button" className="modal-close-v4" onClick={onClose}>
            <X size={18} />
          </button>

          <div className="modal-header-v4">
            <p className="section-kicker">EDIT PROFILE</p>
            <h2>프로필 편집</h2>
            <p>사진과 기본 정보를 한 번에 정리할 수 있어요.</p>
          </div>

          <div className="modal-avatar-area">
            <div className="modal-avatar-preview">
              {selectedPhotoPreview ? (
                <img src={selectedPhotoPreview} alt="preview" />
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
              <span>닉네임</span>
              <input
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                placeholder="닉네임을 입력해 주세요"
                maxLength={15}
              />
            </label>

            <div className="student-toggle-card">
              <div>
                <strong>학생 프로필</strong>
                <span>학교 급식과 시간표를 내 정보에 맞춰 보여줘요.</span>
              </div>
              <label className="switch-v2" aria-label="학생 프로필 사용">
                <input
                  type="checkbox"
                  checked={isStudent}
                  onChange={(e) => setIsStudent(e.target.checked)}
                />
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
                      <span style={{ opacity: schoolName ? 1 : 0.4 }}>
                        {schoolName || '학교를 검색해 주세요'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="school-search-btn"
                      aria-label="학교 검색"
                      onClick={() => setIsSchoolModalOpen(true)}
                    >
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
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
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

          <button
            type="submit"
            className="modal-save-btn"
            disabled={!isProfileChanged || isSavingProfile}
          >
            <Check size={18} />
            {isSavingProfile ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>

      <SchoolSearchModal
        isOpen={isSchoolModalOpen}
        onClose={() => setIsSchoolModalOpen(false)}
        onSelect={handleSchoolSelect}
      />
    </>
  );
}
