import { Camera, Check, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import type { User } from '../../store/authStore';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  isSavingProfile: boolean;
  handleSaveProfile: (editName: string, editGrade: string, editClass: string, selectedPhotoFile: File | null) => Promise<boolean>;
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
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen && user) {
      setEditName(user.name || '');
      setEditGrade(user.grade || '');
      setEditClass(user.class || '');
      setSelectedPhotoPreview(user.photoURL || '');
    } else {
      setSelectedPhotoFile(null);
      setSelectedPhotoPreview('');
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', '이미지 파일만 업로드할 수 있어요.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', '프로필 사진은 5MB 이하만 업로드할 수 있어요.');
      return;
    }

    setSelectedPhotoFile(file);
    setSelectedPhotoPreview(URL.createObjectURL(file));
  };

  const isProfileChanged =
    editName.trim() !== user.name ||
    editGrade !== (user.grade || '') ||
    editClass !== (user.class || '') ||
    Boolean(selectedPhotoFile);

  const onSave = async () => {
    const success = await handleSaveProfile(editName, editGrade, editClass, selectedPhotoFile);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay-v4" onClick={onClose}>
      <div className="modal-card-v4" onClick={(event) => event.stopPropagation()}>
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
              <div className="profile-avatar-fallback">{user.name[0]}</div>
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

          <div className="field-row">
            <label className="field-group">
              <span>학년</span>
              <select value={editGrade} onChange={(event) => setEditGrade(event.target.value)}>
                <option value="">선택</option>
                <option value="1">1학년</option>
                <option value="2">2학년</option>
                <option value="3">3학년</option>
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

        <button
          type="button"
          className="modal-save-btn"
          onClick={onSave}
          disabled={!isProfileChanged || isSavingProfile}
        >
          <Check size={18} />
          {isSavingProfile ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
