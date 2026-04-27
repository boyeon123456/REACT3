import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useAuthStore } from '../store/authStore';
import type { User } from '../store/authStore';
import type { ToastState, InventoryItem } from '../types/profile';

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
    selectedPhotoFile: File | null
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

      if (selectedPhotoFile) {
        const photoRef = ref(storage, `profiles/${user.id}/${Date.now()}-${selectedPhotoFile.name}`);
        await uploadBytes(photoRef, selectedPhotoFile);
        photoURL = await getDownloadURL(photoRef);
      }

      await updateProfile(auth.currentUser, {
        displayName: trimmedName,
        ...(photoURL ? { photoURL } : {}),
      });

      await updateDoc(doc(db, 'users', user.id), {
        name: trimmedName,
        grade: editGrade,
        class: editClass,
        ...(photoURL ? { photoURL } : {}),
      });

      patchUser({
        name: trimmedName,
        grade: editGrade,
        class: editClass,
        ...(photoURL ? { photoURL } : {}),
      });

      showToast('success', '프로필이 깔끔하게 업데이트됐어요.');
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('error', '프로필 저장에 실패했어요. 다시 시도해 주세요.');
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
