export type TabKey = 'overview' | 'inventory' | 'settings';
export type InventoryFilter = 'all' | 'badge' | 'nameColor' | 'profileBg' | 'avatarFrame';

export type PostItem = {
  id: string;
  title: string;
  board?: string;
  created_at?: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  type: 'badge' | 'nameColor' | 'profileBg' | 'avatarFrame';
  style?: string;
};

export type ToastState = {
  type: 'success' | 'error';
  message: string;
} | null;

export const defaultSettings = {
  notifications: {
    inApp: true,
    email: false,
  },
};

export const typeLabels: Record<InventoryItem['type'], string> = {
  badge: '배지',
  nameColor: '닉네임 색상',
  profileBg: '프로필 배경',
  avatarFrame: '아바타 프레임',
};
