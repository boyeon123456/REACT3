import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAeaKUJLclTweWQXDErsZwBigWDCWU0Y6U",
  authDomain: "myschool-board.firebaseapp.com",
  projectId: "myschool-board",
  storageBucket: "myschool-board.firebasestorage.app",
  messagingSenderId: "793842094701",
  appId: "1:793842094701:web:748fd7802e0937d7956564",
  measurementId: "G-YHWYLEWQ91"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
