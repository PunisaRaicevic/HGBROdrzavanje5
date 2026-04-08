import { initializeApp } from "firebase/app";
import { getMessaging, getToken, type Messaging } from "firebase/messaging";
import { Capacitor } from "@capacitor/core";

const firebaseConfig = {
  apiKey: "AIzaSyAG8vYe5WM_3JhXYUj9C6UIrut4FnRBAxU",
  authDomain: "hgbtapp.firebaseapp.com",
  projectId: "hgbtapp",
  storageBucket: "hgbtapp.firebasestorage.app",
  messagingSenderId: "375153203002",
  appId: "1:375153203002:android:d57aea9c9c9cd906372203",
};

const app = initializeApp(firebaseConfig);

// getMessaging() requires Service Worker API which is NOT available
// in Capacitor native WebView (Android/iOS).
// On native platforms we use @capacitor/push-notifications instead.
let messaging: Messaging | null = null;

if (!Capacitor.isNativePlatform()) {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.warn("[Firebase] Web Messaging init failed:", e);
  }
}

export { messaging, getToken };
