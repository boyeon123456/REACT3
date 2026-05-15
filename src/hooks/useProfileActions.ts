import { useState } from 'react';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import type { User } from '../store/authStore';
import { defaultSettings } from '../types/profile';
import type { AppearanceSettings, InventoryItem, PrivacySettings, ToastState } from '../types/profile';

const PROFILE_PHOTO_MAX_BYTES = 600 * 1024;
const PROFILE_PHOTO_DIMENSIONS = [900, 720, 560, 420];
const PROFILE_PHOTO_QUALITIES = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38];
const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;

function getErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : '';
  }

  return '';
}

function getProfileSaveErrorMessage(error: unknown) {
  const code = getErrorCode(error);

  if (code === 'permission-denied') {
    return '프로필 저장 권한이 거부됐어요. 잠시 후 다시 시도해 주세요.';
  }

  if (code === 'storage/unauthorized') {
    return '프로필 사진 업로드 권한이 거부되었어요. Storage rules 배포와 버킷 설정을 확인해 주세요.';
  }

  if (code === 'storage/retry-limit-exceeded' || code === 'storage/canceled') {
    return '사진 업로드 연결이 끊겼어요. 네트워크를 확인하고 다시 시도해 주세요.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '프로필 저장에 실패했어요. 다시 시도해 주세요.';
}

function normalizeHandle(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, '');
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
    throw new Error('사진을 프로필에 저장할 만큼 작게 압축하지 못했어요. 더 작은 이미지를 선택해 주세요.');
  }

  return new File([bestBlob], 'profile-photo.jpg', { type: 'image/jpeg' });
}

export function useProfileActions() {
  const user = useAuthStore((state) => state.user);
  const patchUser = useAuthStore((state) => state.patchUser);
  const logout = useAuthStore((state) => state.logout);
  const applyAppearance = useThemeStore((state) => state.applyAppearance);

  const [toast, setToast] = useState<ToastState>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [savingSettingKey, setSavingSettingKey] = useState<'inApp' | 'email' | 'appearance' | 'privacy' | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
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
    officeCode: string,
    bio: string,
    statusMessage: string,
    featuredBadgeId: string,
    handle?: string
  ) => {
    if (!user || !auth.currentUser) return false;

    const trimmedName = editName.trim();
    if (trimmedName.length < 2) {
      showToast('error', '닉네임은 2자 이상으로 입력해 주세요.');
      return false;
    }

    const normalizedHandle = normalizeHandle(handle || '');
    if (normalizedHandle && !HANDLE_PATTERN.test(normalizedHandle)) {
      showToast('error', '아이디는 영문 소문자, 숫자, 밑줄만 사용해 3~20자로 입력해 주세요.');
      return false;
    }

    if (normalizedHandle && normalizedHandle !== (user.handle || '')) {
      const handleQuery = query(collection(db, 'users'), where('handle', '==', normalizedHandle));
      const handleSnap = await getDocs(handleQuery);
      const duplicated = handleSnap.docs.some((item) => item.id !== user.id);
      if (duplicated) {
        showToast('error', '이미 사용 중인 아이디예요.');
        return false;
      }
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
        handle: normalizedHandle,
        profileStyle: {},
        settings: {
          ...defaultSettings,
          ...user.settings,
          notifications: {
            ...defaultSettings.notifications,
            ...user.settings?.notifications,
          },
          appearance: {
            ...defaultSettings.appearance,
            ...user.settings?.appearance,
          },
          privacy: {
            ...defaultSettings.privacy,
            ...user.settings?.privacy,
          },
        },
        equipped_items: user.equipped_items || {},
        grade: editGrade,
        class: editClass,
        isStudent,
        schoolName,
        schoolCode,
        officeCode,
        bio: bio.trim(),
        statusMessage: statusMessage.trim(),
        featuredBadgeId: featuredBadgeId.trim(),
        ...(photoURL ? { photoURL } : {}),
      };

      await updateDoc(doc(db, 'users', user.id), updateData);
      patchUser(updateData);

      showToast(
        'success',
        usedFirestorePhotoFallback
          ? 'Storage가 막혀 있어 사진을 프로필 문서에 직접 저장했어요.'
          : '프로필이 깔끔하게 업데이트되었어요.'
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
    fallbackSettings: typeof defaultSettings
  ) => {
    if (!user) return;

    const nextSettings = {
      ...defaultSettings,
      ...currentSettings,
      notifications: {
        inApp: currentSettings?.notifications?.inApp ?? true,
        email: currentSettings?.notifications?.email ?? false,
        [key]: !(currentSettings?.notifications?.[key] ?? fallbackSettings.notifications[key]),
      },
      appearance: {
        ...defaultSettings.appearance,
        ...currentSettings?.appearance,
      },
      privacy: {
        ...defaultSettings.privacy,
        ...currentSettings?.privacy,
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

  const handleUpdateAppearance = async (updates: Partial<AppearanceSettings>) => {
    if (!user) return;

    const currentSettings = user.settings;
    const nextAppearance = {
      ...defaultSettings.appearance,
      ...currentSettings?.appearance,
      ...updates,
    };
    const nextSettings = {
      ...defaultSettings,
      ...currentSettings,
      notifications: {
        ...defaultSettings.notifications,
        ...currentSettings?.notifications,
      },
      appearance: nextAppearance,
      privacy: {
        ...defaultSettings.privacy,
        ...currentSettings?.privacy,
      },
    };

    applyAppearance(nextAppearance);
    patchUser({ settings: nextSettings });
    setSavingSettingKey('appearance');

    try {
      await updateDoc(doc(db, 'users', user.id), { settings: nextSettings });
      showToast('success', '취향 설정을 저장했어요.');
    } catch (error) {
      console.error('Error updating appearance settings:', error);
      const previousAppearance = {
        ...defaultSettings.appearance,
        ...currentSettings?.appearance,
      };
      applyAppearance(previousAppearance);
      patchUser({ settings: currentSettings });
      showToast('error', '취향 설정 저장에 실패했어요.');
    } finally {
      setSavingSettingKey(null);
    }
  };

  const handleUpdatePrivacy = async (updates: Partial<PrivacySettings>) => {
    if (!user) return;

    const currentSettings = user.settings;
    const nextPrivacy = {
      ...defaultSettings.privacy,
      ...currentSettings?.privacy,
      ...updates,
    };
    const nextSettings = {
      ...defaultSettings,
      ...currentSettings,
      notifications: {
        ...defaultSettings.notifications,
        ...currentSettings?.notifications,
      },
      appearance: {
        ...defaultSettings.appearance,
        ...currentSettings?.appearance,
      },
      privacy: nextPrivacy,
    };

    patchUser({ settings: nextSettings });
    setSavingSettingKey('privacy');

    try {
      await updateDoc(doc(db, 'users', user.id), { settings: nextSettings });
      showToast('success', '개인정보 설정을 저장했어요.');
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      patchUser({ settings: currentSettings });
      showToast('error', '개인정보 설정 저장에 실패했어요.');
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
    handleUpdateAppearance,
    handleUpdatePrivacy,
    handleEquip,
    handleLogout,
  };
}
