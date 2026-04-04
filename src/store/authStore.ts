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
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Listen to Firebase Auth state changes globally
  onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const userRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        set({ user: userSnap.data() as User, loading: false });
      } else {
        const newUser: User = {
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || '이름없음',
          points: 0,
          level: 1,
          role: 'user'
        };
        await setDoc(userRef, newUser);
        set({ user: newUser, loading: false });
      }
    } else {
      set({ user: null, loading: false });
    }
  });

  return {
    user: null,
    loading: true,
    login: (user) => set({ user }),
    logout: async () => {
      await fbSignOut(auth);
      set({ user: null });
    },
  };
});
