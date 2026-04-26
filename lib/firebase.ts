import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDMeI9XaVuUlaXWoaLEp40Cu8sv_Fab_3o",
  authDomain: "gestion-etudiant-22e68.firebaseapp.com",
  projectId: "gestion-etudiant-22e68",
  storageBucket: "gestion-etudiant-22e68.firebasestorage.app",
  messagingSenderId: "727920724475",
  appId: "1:727920724475:web:aba048e36b18d926eb635e"
};

// Initialize Firebase only if it hasn't been initialized already (important for Next.js SSR/HMR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
