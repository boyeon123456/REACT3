import { create } from 'zustand';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { isAdminUser } from '../lib/isAdmin';
import { defaultSettings, type AppearanceSettings, type PrivacySettings } from '../types/profile';

export type ProfileStyle = {
  nameColor?: string;
  handleColor?: string;
  bioColor?: string;
  backgroundColor?: string;
};

export interface User {
  id: string;
  email: string;
  name: string;
  points: number;
  level: number;
  role: string;
  handle?: string;
  profileStyle?: ProfileStyle;
  photoURL?: string | null;
  bio?: string;
  statusMessage?: string;
  featuredBadgeId?: string;
  badges?: string[];
  gameCount?: number;
  isBanned?: boolean;
  isStudent?: boolean;
  schoolName?: string;
  schoolCode?: string;
  officeCode?: string;
  grade?: string;
  class?: string;
  equipped_items?: Record<string, string>;
  settings?: {
    notifications?: {
      inApp?: boolean;
      email?: boolean;
    };
    appearance?: Partial<AppearanceSettings>;
    privacy?: Partial<PrivacySettings>;
  };
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  patchUser: (updates: Partial<User>) => void;
  logout: () => void;
}

function withDefaults(user: User): User {
  return {
    ...user,
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
    isStudent: user.isStudent ?? false,
    schoolName: user.schoolName || '',
    schoolCode: user.schoolCode || '',
    officeCode: user.officeCode || '',
    grade: user.grade || '',
    class: user.class || '',
    bio: user.bio || '',
    statusMessage: user.statusMessage || '',
    featuredBadgeId: user.featuredBadgeId || '',
    handle: user.handle || '',
    profileStyle: user.profileStyle || {},
  };
}

export const useAuthStore = create<AuthState>((set) => {
  onAuthStateChanged(auth, async (fbUser) => {
    try {
      if (!fbUser) {
        set({ user: null, loading: false });
        return;
      }

      const userRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userRef);
      const isAdmin = isAdminUser({ email: fbUser.email });

      if (!userSnap.exists()) {
        set({ user: null, loading: false });
        return;
      }

      const userData = withDefaults({
        ...(userSnap.data() as User),
        role: isAdmin ? 'admin' : ((userSnap.data() as User).role || 'user'),
      });

      if (fbUser.photoURL && !userData.photoURL) {
        await setDoc(userRef, { photoURL: fbUser.photoURL || null }, { merge: true });
        set({ user: withDefaults({ ...userData, photoURL: fbUser.photoURL || null }), loading: false });
      } else {
        set({ user: userData, loading: false });
      }
    } catch (err) {
      console.error('Auth state error:', err);
      set({ user: null, loading: false });
    }
  });

  return {
    user: null,
    loading: true,
    login: (user) => set({ user: withDefaults(user) }),
    patchUser: (updates) => set((state) => (state.user ? { user: withDefaults({ ...state.user, ...updates }) } : state)),
    logout: async () => {
      await fbSignOut(auth);
      set({ user: null });
    },
  };
});
