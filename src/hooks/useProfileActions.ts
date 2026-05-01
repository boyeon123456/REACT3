import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useAuthStore } from '../store/authStore';
import type { User } from '../store/authStore';
import type { ToastState, InventoryItem } from '../types/profile';

const PROFILE_PHOTO_MAX_BYTES = 600 * 1024;
const PROFILE_PHOTO_DIMENSIONS = [900, 720, 560, 420];
const PROFILE_PHOTO_QUALITIES = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38];

function getErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

function getProfileSaveErrorMessage(error: unknown) {
  const code = getErrorCode(error);

  if (code === 'storage/unauthorized') {
    return '프로필 사진 업로드 권한이 거부됐어요. Storage rules 배포나 버킷 설정을 확인해 주세요.';
  }

  if (code === 'storage/retry-limit-exceeded' || code === 'storage/canceled') {
    return '사진 업로드 연결이 끊겼어요. 네트워크를 확인하고 다시 시도해 주세요.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '프로필 저장에 실패했어요. 다시 시도해 주세요.';
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러오지 못했어요.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('이미지를 압축하지 못했어요.'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('이미지를 저장 가능한 형식으로 바꾸지 못했어요.'));
    reader.readAsDataURL(blob);
  });
}

async function prepareProfilePhoto(file: File) {
  if (file.size <= PROFILE_PHOTO_MAX_BYTES && file.type === 'image/jpeg') {
    return file;
  }

  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('이미지를 압축할 수 없는 브라우저예요.');
  }

  let bestBlob: Blob | null = null;
  for (const dimension of PROFILE_PHOTO_DIMENSIONS) {
    const scale = Math.min(1, dimension / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of PROFILE_PHOTO_QUALITIES) {
      const blob = await canvasToBlob(canvas, quality);
      bestBlob = blob;
      if (blob.size <= PROFILE_PHOTO_MAX_BYTES) {
        return new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
      }
    }
  }

  if (!bestBlob || bestBlob.size > PROFILE_PHOTO_MAX_BYTES) {
    throw new Error('사진을 앱 프로필에 저장할 만큼 작게 압축하지 못했어요. 더 작은 이미지를 선택해 주세요.');
  }

  return new File([bestBlob], 'profile-photo.jpg', { type: 'image/jpeg' });
}

export function useProfileActions() {
  const user = useAuthStore((state) => state.user);
  const patchUser = useAuthStore((state) => state.patchUser);
  const logout = useAuthStore((state) => state.logout);

  const [toast, setToast] = useState<ToastState>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [savingSettingKey, setSavingSettingKey] = useState<'inApp' | 'email' | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2600);
  };

  const handleSaveProfile = async (
    editName: string,
    editGrade: string,
    editClass: string,
    selectedPhotoFile: File | null,
    isStudent: boolean,
    schoolName: string,
    schoolCode: string,
    officeCode: string
  ) => {
    if (!user || !auth.currentUser) return false;

    const trimmedName = editName.trim();
    if (trimmedName.length < 2) {
      showToast('error', '닉네임은 2자 이상으로 입력해 주세요.');
      return false;
    }

    setIsSavingProfile(true);
    try {
      let photoURL = user.photoURL || null;
      let authPhotoURL: string | null = null;
      let usedFirestorePhotoFallback = false;

      if (selectedPhotoFile) {
        const uploadFile = await prepareProfilePhoto(selectedPhotoFile);
        try {
          const photoRef = ref(storage, `profiles/${user.id}/${Date.now()}-profile-photo.jpg`);
          await uploadBytes(photoRef, uploadFile, { contentType: uploadFile.type });
          photoURL = await getDownloadURL(photoRef);
          authPhotoURL = photoURL;
        } catch (storageError) {
          console.warn('Storage upload failed, saving profile photo in Firestore:', storageError);
          photoURL = await blobToDataUrl(uploadFile);
          usedFirestorePhotoFallback = true;
        }
      }

      await updateProfile(auth.currentUser, {
        displayName: trimmedName,
        ...(authPhotoURL ? { photoURL: authPhotoURL } : {}),
      });

      const updateData = {
        name: trimmedName,
        grade: editGrade,
        class: editClass,
        isStudent,
        schoolName,
        schoolCode,
        officeCode,
        ...(photoURL ? { photoURL } : {}),
      };

      await updateDoc(doc(db, 'users', user.id), updateData);

      patchUser(updateData);

      showToast(
        'success',
        usedFirestorePhotoFallback
          ? 'Storage가 막혀서 사진을 앱 프로필에 직접 저장했어요.'
          : '프로필이 깔끔하게 업데이트됐어요.'
      );
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('error', getProfileSaveErrorMessage(error));
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleNotification = async (
    key: 'inApp' | 'email',
    currentSettings: User['settings'],
    defaultSettings: { notifications: { inApp: boolean; email: boolean; } }
  ) => {
    if (!user) return;

    const nextSettings = {
      notifications: {
        inApp: currentSettings?.notifications?.inApp ?? true,
        email: currentSettings?.notifications?.email ?? false,
        [key]: !(currentSettings?.notifications?.[key] ?? defaultSettings.notifications[key]),
      },
    };

    setSavingSettingKey(key);
    try {
      await updateDoc(doc(db, 'users', user.id), { settings: nextSettings });
      patchUser({ settings: nextSettings });
      showToast('success', '알림 설정을 저장했어요.');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('error', '설정 저장에 실패했어요.');
    } finally {
      setSavingSettingKey(null);
    }
  };

  const handleEquip = async (item: InventoryItem) => {
    if (!user) return;

    const currentEquipped = user.equipped_items || {};
    const isEquipped = currentEquipped[item.type] === item.id;
    const nextEquipped = { ...currentEquipped };

    if (isEquipped) {
      delete nextEquipped[item.type];
    } else {
      nextEquipped[item.type] = item.id;
    }

    try {
      await updateDoc(doc(db, 'users', user.id), { equipped_items: nextEquipped });
      patchUser({ equipped_items: nextEquipped });
      showToast('success', isEquipped ? '아이템 장착을 해제했어요.' : '아이템을 장착했어요.');
    } catch (error) {
      console.error('Error equipping item:', error);
      showToast('error', '아이템 적용에 실패했어요.');
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('정말 로그아웃할까요?')) return;
    await logout();
  };

  return {
    toast,
    setToast,
    showToast,
    isSavingProfile,
    savingSettingKey,
    handleSaveProfile,
    handleToggleNotification,
    handleEquip,
    handleLogout,
  };
}
