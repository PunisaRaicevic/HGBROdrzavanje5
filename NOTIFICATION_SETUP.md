# 🔔 JAKA NOTIFIKACIJA - Kompletna Dokumentacija

## ✅ ŠTA JE AUTOMATSKI URAĐENO

### 1. Instalirani Capacitor pluginovi
- ✅ `@capacitor/push-notifications`
- ✅ `@capacitor/local-notifications`
- ✅ `@capacitor/haptics`
- ✅ `@capawesome/capacitor-badge`

### 2. Android permisije (AndroidManifest.xml)
- ✅ `INTERNET`, `POST_NOTIFICATIONS`, `VIBRATE`, `WAKE_LOCK`

### 3. Kod implementiran u `client/src/main.tsx`
- ✅ **JAKA VIBRACIJA**: `ERROR notification` + `HEAVY impact`
- ✅ **CUSTOM ZVUK**: Notification channel "reklamacije-alert" sa `alert1` zvukom
- ✅ **BADGE SISTEM**: Automatsko povećavanje/čišćenje sa proper permissions
- ✅ **HYBRID PUSH STRATEGY**: Radi u foreground, background i terminated stanju

### 4. Zvučni fajl - AUTOMATSKI KONVERTOVAN! ✅
- ✅ **Android**: `android/app/src/main/res/raw/alert1.mp3` (66KB, 3 sek)
- ✅ **Za iOS**: `attached_assets/alert1.mp3` (kopirajte u Xcode)

---

## ⚠️ SAMO JEDAN KORAK OSTAO - iOS ZVUK

**Dodajte `attached_assets/alert1.mp3` u iOS projekat preko Xcode-a:**

```bash
npx cap open ios
```

U Xcode: **Add Files → Select alert1.mp3 → ✓ Copy items if needed → ✓ Add to targets**

---

## 📋 BACKEND INTEGRACIJA - HYBRID STRATEGY

### Zašto HYBRID?

**Problem sa data-only pushes:**
- ✅ Rade u foreground (JavaScript listener)
- ❌ NE rade u background/terminated (listener se ne izvršava!)

**Problem sa notification-only pushes:**
- ✅ Rade u background/terminated
- ❌ Neki uređaji (Samsung, Xiaomi) prikazuju i u foreground → duplikat!

**REŠENJE: HYBRID**
- Backend šalje **notification block** + **data block**
- Background/terminated: Android prikazuje notifikaciju sa custom zvukom
- Foreground: Aplikacija odlučuje da li treba lokalna notifikacija

---

### ✅ ISPRAVNI FCM PAYLOAD (koristite ovaj!)

```javascript
const admin = require('firebase-admin');

async function sendTaskNotification(deviceToken, task) {
  const message = {
    token: deviceToken,
    
    // NOTIFICATION BLOCK - Za background i terminated stanje
    notification: {
      title: `Nova reklamacija #${task.id}`,
      body: `${task.hotel} - ${task.soba}: ${task.description}`,
    },
    
    // ANDROID SPECIFIČNO
    android: {
      priority: 'high',
      notification: {
        channelId: 'reklamacije-alert',  // KRITIČNO! Mora biti isti kao u kodu
        sound: 'alert1',                  // Bez .mp3 ekstenzije
        priority: 'high',
        vibrateTimingsMillis: [0, 500, 250, 500],
      }
    },
    
    // DATA BLOCK - Za foreground handling i dodatne podatke
    data: {
      taskId: task.id.toString(),
      priority: task.priority,
      hotel: task.hotel,
      soba: task.soba,
      type: 'new_task',
      // Opciono: Backend može kontrolisati da li treba lokalna notifikacija u foreground-u
      // forceLocal: 'true'   // Default je true
      // forceLocal: 'false'  // Ako ne želite lokalnu notifikaciju u foreground-u
    },
    
    // iOS SPECIFIČNO
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          alert: {
            title: `Nova reklamacija #${task.id}`,
            body: `${task.hotel} - ${task.soba}: ${task.description}`,
          },
          sound: 'alert1.mp3',  // SA ekstenzijom za iOS
          badge: 1,
          'thread-id': 'reklamacije'
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Push poslat:', response);
    return { success: true };
  } catch (error) {
    console.error('❌ Greška:', error);
    return { success: false, error: error.message };
  }
}
```

---

### Kako HYBRID strategy radi

```
┌─────────────────────────────────────────────────────────┐
│ Backend šalje FCM sa notification + data block          │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                        │
    BACKGROUND              FOREGROUND
    TERMINATED              (app open)
        │                        │
        ▼                        ▼
  Android OS             pushNotificationReceived
  prikazuje              listener aktiviran
  notifikaciju                  │
  automatski                    ├─→ Vibracija (ERROR+HEAVY) ✓
        │                       ├─→ Badge++ ✓
        ├─→ Custom zvuk ✓       └─→ Opciono: Lokalna notifikacija
        ├─→ Vibracija ✓              (default: DA, osim ako forceLocal=false)
        └─→ Koristi channel
            "reklamacije-alert"

REZULTAT: JEDNA notifikacija u oba scenarija! ✓
```

---

## 💻 KOMPLETNI BACKEND PRIMER (Node.js + Firebase)

```javascript
const admin = require('firebase-admin');

// 1. Inicijalizacija (jednom pri pokretanju)
admin.initializeApp({
  credential: admin.credential.cert(require('./firebase-service-account.json'))
});

// 2. Registracija push token-a
app.post("/api/users/push-token", async (req, res) => {
  const { token } = req.body;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  await storage.updateUserPushToken(userId, token);
  res.json({ success: true });
});

// 3. Slanje notifikacije pri kreiranju taska
app.post("/api/tasks", async (req, res) => {
  const newTask = await storage.createTask(req.body);
  
  if (newTask.assignedToRadnikId) {
    const user = await storage.getUserById(newTask.assignedToRadnikId);
    if (user?.pushToken) {
      await sendTaskNotification(user.pushToken, newTask);
    }
  }
  
  res.json({ task: newTask });
});

// 4. Slanje notifikacije pri dodeli radniku
app.patch("/api/tasks/:id", async (req, res) => {
  const updatedTask = await storage.updateTask(req.params.id, req.body);
  
  if (req.body.assignedToRadnikId) {
    const user = await storage.getUserById(req.body.assignedToRadnikId);
    if (user?.pushToken) {
      await sendTaskNotification(user.pushToken, updatedTask);
    }
  }
  
  res.json({ task: updatedTask });
});
```

---

## 🧪 TESTIRANJE

### OBAVEZNO: Testirajte na PRAVIM uređajima!

Emulatori ne podržavaju: push notifikacije, haptic feedback, badge, custom zvukove.

### Android Build:
```bash
npx cap sync android
npx cap open android
# U Android Studio: Build → Build APK → Install na pravi uređaj
```

### iOS Build:
```bash
npx cap sync ios
npx cap open ios
# U Xcode: Select real device → Product → Run
```

### Testirajte SVA TRI scenarija:

| Scenario | Šta testirati |
|----------|---------------|
| **App FOREGROUND** | ✓ Vibracija jako<br>✓ Custom zvuk svira<br>✓ Badge povećan<br>✓ JEDNA notifikacija |
| **App BACKGROUND** | ✓ Notifikacija prikazana<br>✓ Custom zvuk svira<br>✓ Vibracija jako<br>✓ Badge povećan |
| **App TERMINATED** | ✓ Notifikacija prikazana<br>✓ Custom zvuk svira<br>✓ Klik otvara app<br>✓ Badge čišćen |

---

## 🔧 TROUBLESHOOTING

### Custom zvuk ne svira (Android)
**Rešenje**: Deinstalirajte app potpuno i reinstalirajte (da se kreira novi channel)

### Custom zvuk ne svira (iOS)
**Rešenje**: Proverite da je `alert1.mp3` dodat u Xcode → Build Phases → Copy Bundle Resources

### Duplicate notifikacije
**Dijagnoza**: Backend ne koristi hybrid strategy ili šalje notification bez channelId

**Rešenje**:
1. ✅ Proverite da FCM payload ima `android.notification.channelId: "reklamacije-alert"`
2. ✅ Proverite da FCM payload ima notification + data block
3. ✅ Testirajte na pravom uređaju

### Notifikacije ne stižu u background-u
**Dijagnoza**: Backend šalje data-only pushes

**Rešenje**: Koristite HYBRID strategy - dodajte notification block!

### Badge ne radi
**iOS**: Settings → Notifications → [App] → Badges ON  
**Android**: Neki launcheri ne podržavaju (Samsung/Xiaomi rade)

---

## 📊 FINALNI ČEKLIST

### Urađeno ✅
- ✅ Pluginovi instalirani
- ✅ Android permisije
- ✅ Notification channel kreiran
- ✅ Zvučni fajl postavljen (Android)
- ✅ Hybrid strategy implementirana
- ✅ Badge sistem sa permissions
- ✅ Dokumentacija kompletna

### Završeno ✅
- ✅ Firebase projekat setup (`hgbrodrzavanje-39543`)
- ✅ `google-services.json` → `android/app/`
- ✅ Backend endpoint `/api/users/push-token` (implementiran)
- ✅ Backend HYBRID FCM slanje (implementiran u `server/services/firebase.ts`)
- ✅ Push token automatska registracija (frontend integration)
- ✅ Database migracija za `users.push_token` kolonu

### Vi uradite ⏳
- ⏳ iOS zvučni fajl (Xcode)
- ⏳ `GoogleService-Info.plist` → iOS projekat
- ⏳ Testiranje na pravim uređajima (SVA 3 scenarija!)

---

## 🚀 SLEDEĆI KORACI

1. ✅ **Android zvuk** - GOTOVO!
2. ✅ **Firebase projekat** - GOTOVO! (`hgbrodrzavanje-39543`)
3. ✅ **Backend FCM slanje** - GOTOVO! (`server/services/firebase.ts`)
4. ✅ **Push token registracija** - GOTOVO! (automatski pri loginu)
5. ⏳ **iOS zvuk** - Dodajte u Xcode
6. ⏳ **Test** - Foreground + Background + Terminated na PRAVIM uređajima!

---

## 🔥 IMPLEMENTIRANO - FCM BACKEND

### Firebase Admin SDK Inicijalizacija

**Fajl:** `server/index.ts`
```typescript
import { initializeFirebase } from "./services/firebase";
initializeFirebase(); // Poziva se pri pokretanju servera
```

**Environment Variables (Replit Secrets):**
```
FIREBASE_PROJECT_ID=hgbrodrzavanje-39543
FIREBASE_PRIVATE_KEY=<paste_from_service_account_json>
FIREBASE_CLIENT_EMAIL=<paste_from_service_account_json>
```

### Push Token Endpoint

**Endpoint:** `POST /api/users/push-token`

**Automatska registracija:** Frontend (`client/src/main.tsx`) šalje device token na server pri svakom pokretanju aplikacije.

### FCM Slanje pri Task Assignment

**Gde:** `server/routes.ts` → PATCH `/api/tasks/:id`

**Kada:** Status postane `assigned_to_radnik` ili `with_sef`

**Šta šalje:**
- Notification title: `Nova reklamacija #<taskId>`
- Notification body: `<location> - HITNO` (ako je urgent)
- Custom sound: `alert1`
- Channel ID: `reklamacije-alert`
- Data payload: `{ taskId, priority }`

**Implementacija:**
```typescript
// Šalje Socket.IO + FCM istovremeno
if (assigned_to && (status === 'assigned_to_radnik' || status === 'with_sef')) {
  notifyWorkers(assigned_to, task); // Socket.IO
  
  // FCM push notification
  const workerIds = assigned_to.split(',').map(id => id.trim());
  for (const workerId of workerIds) {
    sendPushToUser(workerId, title, body, taskId, priority);
  }
}
```

### Database Schema

**Dodato u `users` tabelu:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
```

---

**Backend je POTPUNO implementiran! 🎉 Testirajte na PRAVIM uređajima!**
