import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDMaf507Om6Dq-RUKmaStCnrfQ9ywUdo44",
  authDomain: "hgbrodrzavanje-39543.firebaseapp.com",
  projectId: "hgbrodrzavanje-39543",
  storageBucket: "hgbrodrzavanje-39543.appspot.com",
  messagingSenderId: "227433602872",
  appId: "1:227433602872:web:3670adb0773591e68debcd",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken };
