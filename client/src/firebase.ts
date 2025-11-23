import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "VITE_FIREBASE_API_KEY_NOT_SET",
  authDomain: "hgbtapp.firebaseapp.com",
  projectId: "hgbtapp",
  storageBucket: "hgbtapp.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "VITE_FIREBASE_MESSAGING_SENDER_ID_NOT_SET",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "VITE_FIREBASE_APP_ID_NOT_SET",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken };
