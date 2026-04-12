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
  photoURL?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const ADMIN_EMAILS = ['admin_test_123@school.com']; // 관리자 목록

export const useAuthStore = create<AuthState>((set) => {
  // Listen to Firebase Auth state changes globally
  onAuthStateChanged(auth, async (fbUser) => {
    try {
      if (fbUser) {
        const userRef = doc(db, 'users', fbUser.uid);
        const userSnap = await getDoc(userRef);
        const isAdmin = ADMIN_EMAILS.includes(fbUser.email || '');
        
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          
          // 관리자 리스트가 변경되었을 경우Firestore 업데이트
          if (userData.role !== (isAdmin ? 'admin' : userData.role)) {
              await setDoc(userRef, { ...userData, role: isAdmin ? 'admin' : userData.role }, { merge: true });
              userData.role = isAdmin ? 'admin' : userData.role;
          }

          if (fbUser.photoURL && userData.photoURL !== fbUser.photoURL) {
            await setDoc(userRef, { ...userData, photoURL: fbUser.photoURL ?? null }, { merge: true });
            set({ user: { ...userData, photoURL: fbUser.photoURL ?? null }, loading: false });
          } else {
            set({ user: userData, loading: false });
          }
        } else {
          const newUser: User = {
            id: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || '이름없음',
            points: 0,
            level: 1,
            role: isAdmin ? 'admin' : 'user',
            photoURL: fbUser.photoURL ?? null
          };
          await setDoc(userRef, newUser);
          set({ user: newUser, loading: false });
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
    login: (user) => set({ user }),
    logout: async () => {
      await fbSignOut(auth);
      set({ user: null });
    },
  };
});
