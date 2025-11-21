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

import OneSignal from 'onesignal-cordova-plugin';
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
// OneSignal će automatski upravljati notifikacijama i kanalima
// ═══════════════════════════════════════════════════════════════

let badgePermissionsGranted = false;

// ═══════════════════════════════════════════════════════════════
// INICIJALIZACIJA ONESIGNAL PUSH NOTIFIKACIJA
// ═══════════════════════════════════════════════════════════════
async function initializePushNotifications() {
  console.log(`${APP_PREFIX} 🔔 [ONESIGNAL INIT] Inicijalizacija...`);

  if (!IS_NATIVE) {
    console.log(`${APP_PREFIX} ❌ Push notifikacije rade samo na telefonu`);
    return;
  }

  try {
    // Badge permisije
    try {
      const badgePerms = await Badge.requestPermissions();
      badgePermissionsGranted = badgePerms.display === "granted";
      console.log(`${APP_PREFIX} ✅ Badge permisije:`, badgePermissionsGranted);
    } catch (error) {
      console.error(`${APP_PREFIX} ❌ Badge permisije greška:`, error);
    }

    console.log(`${APP_PREFIX} 🔔 Inicijalizacija OneSignal...`);

    // ✅ ISPRAVAN OneSignal 5.x Cordova API
    const onesignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID || "2ec1f2df-17ac-4450-9ed5-9159640c4c4b";
    console.log(`${APP_PREFIX} 🔔 OneSignal App ID:`, onesignalAppId);

    OneSignal.initialize(onesignalAppId);
    console.log(`${APP_PREFIX} ✅ OneSignal inicijalizovan`);

    // Traži push permisije
    OneSignal.Notifications.requestPermission(true);
    console.log(`${APP_PREFIX} ✅ Push permisije zatražene`);

    // Foreground notifikacije - vibriraj i povećaj badge
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', async (event) => {
      console.log(`${APP_PREFIX} 🔔 Foreground notifikacija:`, event);

      await vibrateStrong();

      if (badgePermissionsGranted) {
        try {
          await Badge.increase();
          console.log(`${APP_PREFIX} ✅ Badge povećan`);
        } catch (e) {
          console.error(`${APP_PREFIX} ❌ Badge increase greška:`, e);
        }
      }
    });

    // Kada korisnik klikne na notifikaciju
    OneSignal.Notifications.addEventListener('click', async (event) => {
      console.log(`${APP_PREFIX} 🔔 Kliknuto na notifikaciju:`, event);

      if (badgePermissionsGranted) {
        try {
          await Badge.clear();
          console.log(`${APP_PREFIX} ✅ Badge očišćen`);
        } catch (e) {
          console.error(`${APP_PREFIX} ❌ Badge clear greška:`, e);
        }
      }

      const data = event.notification.additionalData as any;
      if (data?.taskId) {
        console.log(`${APP_PREFIX} 🔔 Navigacija na task:`, data.taskId);
        window.location.href = `/tasks/${data.taskId}`;
      }
    });

    // Dobij OneSignal Player ID (OneSignal 5.x Cordova API)
    console.log(`${APP_PREFIX} 🔔 Čekam OneSignal Player ID...`);

    const playerId = await new Promise<string | null>((resolve) => {
      try {
        // OneSignal vraća push subscription token async
        setTimeout(() => {
          const token = (OneSignal.User as any).pushSubscription?.token;
          console.log(`${APP_PREFIX} 🔔 OneSignal token pokušaj:`, token || 'null');
          resolve(token || null);
        }, 2000); // Produženo vreme čekanja na 2 sekunde
      } catch (e) {
        console.error(`${APP_PREFIX} ❌ OneSignal token greška:`, e);
        resolve(null);
      }
    });

    if (playerId) {
      console.log(`${APP_PREFIX} ✅ OneSignal Player ID dobijen:`, playerId);

      localStorage.setItem("pending_onesignal_player_id", playerId);

      try {
        const authToken = localStorage.getItem("authToken");
        if (!authToken) {
          console.warn(`${APP_PREFIX} ⚠️ Korisnik nije ulogovan - Player ID će biti poslat kasnije`);
          return;
        }

        console.log(`${APP_PREFIX} 🔔 Slanje Player ID na server...`);

        const response = await fetch(`${BACKEND_URL}/api/users/onesignal-player-id`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ playerId }),
        });

        if (response.ok) {
          console.log(`${APP_PREFIX} ✅ OneSignal Player ID poslat serveru uspešno`);
          localStorage.removeItem("pending_onesignal_player_id");
        } else {
          const errorText = await response.text();
          console.error(`${APP_PREFIX} ❌ Greška pri slanju Player ID:`, errorText);
        }
      } catch (error) {
        console.error(`${APP_PREFIX} ❌ Greška pri slanju OneSignal Player ID:`, error);
      }
    } else {
      console.warn(`${APP_PREFIX} ⚠️ OneSignal Player ID nije dobijen`);
    }
  } catch (error) {
    console.error(`${APP_PREFIX} ❌ Kritična greška pri init OneSignal:`, error);
  }
}

// ═══════════════════════════════════════════════════════════════
// MANUAL RETRY - ONESIGNAL PLAYER ID
// ═══════════════════════════════════════════════════════════════
export async function sendPendingOneSignalPlayerId() {
  const pendingPlayerId = localStorage.getItem("pending_onesignal_player_id");
  const authToken = localStorage.getItem("authToken");

  console.log(`${APP_PREFIX} 🔄 Retry OneSignal Player ID:`, { pendingPlayerId: !!pendingPlayerId, authToken: !!authToken });

  if (!pendingPlayerId || !authToken) return false;

  try {
    const response = await fetch(`${BACKEND_URL}/api/users/onesignal-player-id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ playerId: pendingPlayerId }),
    });

    if (response.ok) {
      console.log(`${APP_PREFIX} ✅ Pending OneSignal Player ID poslat uspešno`);
      localStorage.removeItem("pending_onesignal_player_id");
      return true;
    } else {
      const errorText = await response.text();
      console.error(`${APP_PREFIX} ❌ Greška:`, errorText);
      return false;
    }
  } catch (error) {
    console.error(`${APP_PREFIX} ❌ Network greška:`, error);
    return false;
  }
}

if (typeof window !== "undefined") {
  (window as any).sendPendingOneSignalPlayerId = sendPendingOneSignalPlayerId;
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
    console.log(`${APP_PREFIX} 📱 Detektovan Android/iOS - inicijalizujem push notifikacije...`);
    initializePushNotifications();
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