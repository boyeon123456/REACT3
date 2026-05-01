import { create } from 'zustand';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  name: string;
  points: number;
  level: number;
  role: string;
  photoURL?: string | null;

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
  };
}



interface AuthState {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  patchUser: (updates: Partial<User>) => void;
  logout: () => void;
}

const ADMIN_EMAILS = ['admin_test_123@school.com', 'boyeon5600@gmail.com']; // 관리자 목록
const defaultSettings = {
  notifications: {
    inApp: true,
    email: false,
  },
};

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
    },
    equipped_items: user.equipped_items || {},
    isStudent: user.isStudent ?? false,
    schoolName: user.schoolName || '',
    schoolCode: user.schoolCode || '',
    officeCode: user.officeCode || '',
    grade: user.grade || '',
    class: user.class || '',
  };
}

export const useAuthStore = create<AuthState>((set) => {
  // Listen to Firebase Auth state changes globally
  onAuthStateChanged(auth, async (fbUser) => {
    try {
      if (fbUser) {
        const userRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userRef);
        const isAdmin = ADMIN_EMAILS.includes(fbUser.email || '');

        if (userSnap.exists()) {
          const userData = withDefaults(userSnap.data() as User);

          // 관리자 권한 업데이트
          if (userData.role !== (isAdmin ? 'admin' : 'user')) {
            await setDoc(userRef, { ...userData, role: isAdmin ? 'admin' : userData.role }, { merge: true });
            userData.role = isAdmin ? 'admin' : userData.role;
          }

          if (fbUser.photoURL && !userData.photoURL) {
            await setDoc(userRef, { ...userData, photoURL: fbUser.photoURL || null }, { merge: true });
            set({ user: withDefaults({ ...userData, photoURL: fbUser.photoURL || null }), loading: false });
          } else {
            set({ user: userData, loading: false });
          }
        } else {
          // 문서가 없으면 로딩 해제 (생성은 Login.tsx가 담당)
          set({ user: null, loading: false });
        }
      } else {
        set({ user: null, loading: false });
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
    patchUser: (updates) => set((state) => state.user ? { user: withDefaults({ ...state.user, ...updates }) } : state),
    logout: async () => {
      await fbSignOut(auth);
      set({ user: null });
    },
  };
});
