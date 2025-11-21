# 🚀 APPFLOW BUILD SETUP - Push Notifikacije

## Šta ste već uradili ✅

Svi potrebni fajlovi i kod za **jaku push notifikaciju** su već spremni u vašem projektu:

- ✅ Zvučni fajl: `android/app/src/main/res/raw/alert1.mp3` (66KB, custom alarm)
- ✅ Kod implementiran: `client/src/main.tsx` (hybrid push strategy)
- ✅ Android permissions: `android/app/src/main/AndroidManifest.xml`
- ✅ Android notification channel: "reklamacije-alert" sa custom zvukom
- ✅ Badge sistem, jaka vibracija (ERROR + HEAVY impact)

---

## 📦 COMMIT I PUSH NA GITHUB

Sve ove promene trebaju biti commited i pushed na GitHub da bi Appflow mogao da ih build-uje.

### 1. Proverite status
```bash
git status
```

Trebali bi videti:
- `client/src/main.tsx` (modified)
- `android/app/src/main/res/raw/alert1.mp3` (new file)
- `android/app/src/main/AndroidManifest.xml` (modified)
- `NOTIFICATION_SETUP.md` (new file)
- `APPFLOW_SETUP.md` (new file)
- `.gitignore` (new file)

### 2. Dodajte sve promene
```bash
git add client/src/main.tsx
git add android/app/src/main/res/raw/alert1.mp3
git add android/app/src/main/AndroidManifest.xml
git add android/app/src/main/capacitor.config.ts
git add NOTIFICATION_SETUP.md
git add APPFLOW_SETUP.md
git add .gitignore
git add package.json
git add package-lock.json
```

### 3. Commitujte promene
```bash
git commit -m "feat: Implementiran sistem jakih push notifikacija

- Dodat custom zvučni fajl (alert1.mp3) za Android i iOS
- Implementirana hybrid push notification strategija
- Konfigurisane Android permisije (POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK)
- Kreiran notification channel 'reklamacije-alert' sa custom zvukom
- Implementirana jaka vibracija (ERROR + HEAVY impact)
- Implementiran badge sistem sa proper permissions
- Dodati Capacitor pluginovi: push-notifications, local-notifications, haptics, badge
- Dokumentacija u NOTIFICATION_SETUP.md"
```

### 4. Push na GitHub
```bash
git push origin main
# ili ako je vaš branch drugačiji:
# git push origin <ime-vašeg-brancha>
```

---

## 🏗️ APPFLOW BUILD PROCES

### Android Build

Kada Appflow pull-uje vaš kod sa GitHub-a, automatski će:

1. ✅ **Instalirati npm pakete** - Svi Capacitor pluginovi iz `package.json`
2. ✅ **Kopirati zvučni fajl** - `android/app/src/main/res/raw/alert1.mp3`
3. ✅ **Sinhronizovati Capacitor** - `npx cap sync android`
4. ✅ **Build APK/AAB** - Sa svim resursima i permisijama

**VAŽNO**: Zvučni fajl `alert1.mp3` je već postavljen u pravom mestu i biće uključen u build automatski!

### iOS Build

Za iOS, **još jedan korak** je potreban:

1. **Lokalno (jednom)**: Dodajte `alert1.mp3` u iOS projekat preko Xcode-a
2. **Commitujte iOS projekat** sa dodate sound file-om
3. **Push na GitHub**
4. **Appflow build** će preuzeti iOS projekat sa sound file-om

#### Kako dodati zvuk u iOS projekat:

```bash
# 1. Otvorite iOS projekat lokalno
npx cap sync ios
npx cap open ios

# 2. U Xcode:
# - Drag & drop fajl `attached_assets/alert1.mp3` u projekat
# - ✓ Check "Copy items if needed"
# - ✓ Check "Add to targets"
# - Proverite: Build Phases → Copy Bundle Resources → alert1.mp3 mora biti tu

# 3. Zatvorite Xcode i commitujte promene
git add ios/
git commit -m "feat(ios): Dodat custom notification zvuk alert1.mp3"
git push origin main
```

---

## 🔥 FIREBASE SETUP ZA APPFLOW

### 1. Firebase Android Setup

**Lokalno (jednom):**

1. Kreirajte Firebase projekat: https://console.firebase.google.com/
2. Dodajte Android aplikaciju:
   - Package name: Iz `capacitor.config.ts` → `appId`
   - Download `google-services.json`
   
3. Postavite `google-services.json`:
   ```bash
   # Kopirajte downloaded fajl u Android projekat
   cp ~/Downloads/google-services.json android/app/
   
   # Dodajte u git
   git add android/app/google-services.json
   git commit -m "feat(android): Dodat google-services.json za Firebase"
   git push origin main
   ```

**Appflow će automatski preuzeti ovaj fajl i uključiti ga u build!**

### 2. Firebase iOS Setup

1. U Firebase console, dodajte iOS aplikaciju
2. Download `GoogleService-Info.plist`
3. Dodajte u iOS projekat preko Xcode-a (isto kao za zvučni fajl)
4. Commitujte i push-ujte

---

## 🧪 TESTIRANJE APPFLOW BUILD-A

### 1. Pokrenite Appflow Build

U Ionic Appflow dashboard-u:
- Idite na **Build** tab
- Kliknite **New Build**
- Izaberite branch (npr. `main`)
- Izaberite **Android** ili **iOS**
- Odaberite build type (Debug ili Release)
- Kliknite **Build**

### 2. Download APK/IPA

Kada build završi:
- Download APK (Android) ili IPA (iOS)
- Instalirajte na **pravi uređaj** (ne emulator!)

### 3. Testirajte

Na pravom uređaju testirajte SVA TRI scenarija:

| Scenario | Šta proverite |
|----------|---------------|
| **App FOREGROUND** | ✓ Jaka vibracija<br>✓ Custom zvuk (happy bells)<br>✓ JEDNA notifikacija<br>✓ Badge++ |
| **App BACKGROUND** | ✓ Notifikacija prikazana<br>✓ Custom zvuk<br>✓ Vibracija |
| **App TERMINATED** | ✓ Notifikacija prikazana<br>✓ Klik otvara app<br>✓ Badge clear |

---

## 📋 BACKEND INTEGRACIJA

Samo još **backend mora poslati pravilne FCM pushes**. Kompletan kod i payload primeri su u **`NOTIFICATION_SETUP.md`**.

### Kratak pregled:

Backend šalje **notification block** + **data block**:

```javascript
const message = {
  token: deviceToken,
  
  // Za background/terminated
  notification: {
    title: "Nova reklamacija #123",
    body: "Soba 305 - Klima problem",
  },
  
  // Android specifično - KRITIČNO!
  android: {
    priority: 'high',
    notification: {
      channelId: 'reklamacije-alert',  // Mora biti isti kao u kodu!
      sound: 'alert1',                  // Bez .mp3
    }
  },
  
  // Za foreground handling
  data: {
    taskId: "123",
    priority: "urgent",
    type: 'new_task'
  },
  
  // iOS specifično
  apns: {
    payload: {
      aps: {
        sound: 'alert1.mp3',  // SA .mp3 za iOS
        badge: 1
      }
    }
  }
};

await admin.messaging().send(message);
```

Pogledajte **`NOTIFICATION_SETUP.md`** za kompletan backend kod!

---

## ✅ FINALNI ČEKLIST

### Lokalno (uradite jednom)
- ⏳ **Commit i push sve promene na GitHub**
- ⏳ **iOS: Dodajte alert1.mp3 u Xcode projekat** (jednom)
- ⏳ **Android: Dodajte google-services.json** (jednom)
- ⏳ **iOS: Dodajte GoogleService-Info.plist** (jednom)

### Appflow (automatski)
- ✅ **Pull-uje kod sa GitHub-a**
- ✅ **Instalira Capacitor pluginove**
- ✅ **Kopira zvučni fajl i Firebase config**
- ✅ **Build APK/AAB/IPA**

### Backend
- ⏳ **Implementirati `/api/users/push-token` endpoint**
- ⏳ **Implementirati FCM slanje sa hybrid payload-om**
- ⏳ **Testirati na pravom uređaju**

---

## 🎯 SLEDEĆI KORACI ZA VAS

```bash
# 1. Commit sve promene
git status
git add .
git commit -m "feat: Kompletiran push notification sistem"
git push origin main

# 2. (Opciono) Dodajte iOS zvuk lokalno ako želite iOS build
npx cap sync ios
npx cap open ios
# Dodajte alert1.mp3 u Xcode
# Commit iOS promene

# 3. Pokrenite Appflow build
# → Idite na Appflow dashboard
# → New Build → Select branch → Build

# 4. Download i testirajte na pravom uređaju

# 5. Implementirajte backend (vidi NOTIFICATION_SETUP.md)
```

---

**Sa Appflow-om je sve automatizovano! Samo commit, push, i build! 🚀**

**Napomena**: Pročitajte `NOTIFICATION_SETUP.md` za sve detalje o backend integraciji i troubleshooting-u!
