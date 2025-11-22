import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

// Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDlQxlkT9oJ7K8_H5L6M9N0P1Q2R3S4T5U",
  authDomain: "hgbrodrzavanje-39543.firebaseapp.com",
  projectId: "hgbrodrzavanje-39543",
  storageBucket: "hgbrodrzavanje-39543.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890ghijkl",
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

// Get Messaging service (only available on native/web with service worker)
export const messaging = (() => {
  try {
    return getMessaging(firebaseApp);
  } catch (error) {
    console.warn("[Firebase] Messaging not available on this platform");
    return null;
  }
})();

console.log("[Firebase] Initialized with project:", firebaseConfig.projectId);
