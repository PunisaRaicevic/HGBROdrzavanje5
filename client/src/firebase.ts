import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAG8vYe5WM_3JhXYUj9C6UIrut4FnRBAxU",
  authDomain: "hgbtapp.firebaseapp.com",
  projectId: "hgbtapp",
  storageBucket: "hgbtapp.firebasestorage.app",
  messagingSenderId: "375153203002",
  appId: "1:375153203002:web:d47dccb37e23043372203",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken };
