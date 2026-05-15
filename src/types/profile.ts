export type TabKey = 'posts' | 'activity' | 'saved' | 'inventory';
export type InventoryFilter = 'all' | 'badge' | 'nameColor' | 'profileBg' | 'avatarFrame';
export type AppearanceTheme = 'light' | 'dark';
export type AppearanceAccent = 'blue' | 'coral' | 'mint' | 'violet';
export type AppearanceDensity = 'comfortable' | 'compact';

export type AppearanceSettings = {
  theme: AppearanceTheme;
  accent: AppearanceAccent;
  density: AppearanceDensity;
  reducedMotion: boolean;
};

export type PrivacySettings = {
  hideSchoolName: boolean;
};

export type PostItem = {
  id: string;
  title: string;
  board?: string;
  boardKey?: string;
  content?: string;
  imageUrl?: string | null;
  anonymous?: boolean;
  created_at?: number;
};

export type BookmarkItem = {
  id: string;
  postId: string;
  title: string;
  boardKey?: string;
  createdAt?: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  type: 'badge' | 'nameColor' | 'profileBg' | 'avatarFrame';
  style?: string;
};

export type ToastState = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

export const defaultSettings = {
  notifications: {
    inApp: true,
    email: false,
  },
  appearance: {
    theme: 'light',
    accent: 'blue',
    density: 'comfortable',
    reducedMotion: false,
  } satisfies AppearanceSettings,
  privacy: {
    hideSchoolName: false,
  } satisfies PrivacySettings,
};

export const typeLabels: Record<InventoryItem['type'], string> = {
  badge: '배지',
  nameColor: '이름색',
  profileBg: '프로필 배경',
  avatarFrame: '아바타 프레임',
};
