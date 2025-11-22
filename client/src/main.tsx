import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n";

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Badge } from '@capawesome/capacitor-badge';
import { Capacitor } from '@capacitor/core';

// 🔥 Tvoj backend URL (SAMO OVO PROMENI AKO REPLIT PROMENI ADRESU)
const BACKEND_URL =
  "https://0f8348da-785a-4a32-a048-3781e2402d8c-00-1ifebzeou9igx.picard.replit.dev";

// ═══════════════════════════════════════════════════════════════
// 🎯 PLATFORM DETECTION - detektuj odmah pri učitavanju
// ═══════════════════════════════════════════════════════════════
const PLATFORM = Capacitor.getPlatform();
const IS_NATIVE = Capacitor.isNativePlatform();
const APP_PREFIX = IS_NATIVE ? `[APP ${PLATFORM.toUpperCase()}]` : '[APP WEB]';

// Globalne varijable
(window as any).PLATFORM = PLATFORM;
(window as any).IS_NATIVE = IS_NATIVE;
(window as any).APP_PREFIX = APP_PREFIX;

console.log('═══════════════════════════════════════════');
console.log('🔍 PLATFORM DETECTION');
console.log('═══════════════════════════════════════════');
console.log('Platform:', PLATFORM);
console.log('Is Native:', IS_NATIVE);
console.log('App Prefix:', APP_PREFIX);
console.log('Capacitor Available:', !!window.Capacitor);
console.log('═══════════════════════════════════════════');

// ═══════════════════════════════════════════════════════════════
// 📡 REMOTE LOGGER - šalje sve logove na backend u realnom vremenu
// ═══════════════════════════════════════════════════════════════
function setupRemoteLogger() {
  ['log', 'warn', 'error'].forEach((fn) => {
    const original = (console as any)[fn];
    (console as any)[fn] = (...args: any[]) => {
      original(...args);
      try {
        fetch("/api/debug/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            level: fn, 
            args: args.map((arg) => {
              try {
                return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
              } catch {
                return '[Circular]';
              }
            }),
            timestamp: new Date().toISOString(),
            platform: PLATFORM, // ✅ Koristi konstantu
            isNative: IS_NATIVE, // ✅ Koristi konstantu
            prefix: APP_PREFIX // ✅ Dodaj prefix
          })
        }).catch(() => {});
      } catch (e) {}
    };
  });
}

// 🚀 Pokreni remote logger ODMAH
setupRemoteLogger();

console.log(`${APP_PREFIX} Remote logger aktiviran`);

// ═══════════════════════════════════════════════════════════════
// JAKA VIBRACIJA
// ═══════════════════════════════════════════════════════════════
async function vibrateStrong() {
  if (IS_NATIVE) {
    try {
      await Haptics.notification({ type: NotificationType.Error });
      await Haptics.impact({ style: ImpactStyle.Heavy });
      console.log(`${APP_PREFIX} ✅ Vibracija izvedena`);
    } catch (error) {
      console.error(`${APP_PREFIX} ❌ Greška pri vibraciji:`, error);
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// START APLIKACIJE - ČEKAJ DA CAPACITOR RUNTIME BUDE DOSTUPAN
// ═══════════════════════════════════════════════════════════════
function waitForCapacitor() {
  return new Promise<void>((resolve) => {
    // Ako je Capacitor već dostupan
    if (window.Capacitor) {
      console.log(`${APP_PREFIX} ✅ Capacitor je dostupan`);
      resolve();
      return;
    }

    console.log(`${APP_PREFIX} ⏳ Čekam Capacitor...`);

    // Čekaj da se capacitor.js učita (max 3 sekunde)
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.Capacitor || attempts > 30) {
        clearInterval(checkInterval);
        if (window.Capacitor) {
          console.log(`${APP_PREFIX} ✅ Capacitor je učitan nakon ${attempts * 100}ms`);
        } else {
          console.log(`${APP_PREFIX} ⚠️ Capacitor nije dostupan nakon čekanja`);
        }
        resolve();
      }
    }, 100);
  });
}

async function startApp() {
  await waitForCapacitor();

  console.log(`${APP_PREFIX} 🚀 Pokretanje aplikacije...`);
  console.log(`${APP_PREFIX} 📱 Platform:`, PLATFORM);
  console.log(`${APP_PREFIX} 📱 Is Native:`, IS_NATIVE);

  if (IS_NATIVE) {
    console.log(`${APP_PREFIX} 📱 Detektovan Android/iOS - Firebase FCM će biti inicijalizovan u App.tsx`);
  } else {
    console.log(`${APP_PREFIX} 🌐 Web verzija - push notifikacije isključene`);
  }

  console.log(`${APP_PREFIX} ✅ Renderujem React aplikaciju...`);
  createRoot(document.getElementById("root")!).render(<App />);
}

startApp().catch((error) => {
  console.error(`${APP_PREFIX} ❌ Kritična greška pri pokretanju:`, error);
  createRoot(document.getElementById("root")!).render(<App />);
});