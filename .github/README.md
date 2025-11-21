# 📱 Mobilna Aplikacija - GitHub Actions Build System

## 🚀 Besplatno! Automatsko build-ovanje Android i iOS aplikacija

Ovaj projekat koristi **GitHub Actions** za potpuno besplatno build-ovanje mobilnih aplikacija. Nema potrebe za Ionic AppFlow ($39-99/mesec)!

---

## ✅ Šta je Konfigurisano

### ✨ Automatski Buildovi

Svaki put kada push-uješ kod na `main` branch, GitHub Actions će **automatski**:

1. ✅ Build-ovati web aplikaciju (`npm run build`)
2. ✅ Sync-ovati sa Capacitor platformom
3. ✅ Build-ovati **Android Debug APK** (za testiranje)
4. ✅ Build-ovati **Android Release AAB** (za Google Play) - *ako je signing konfigurisan*
5. ✅ Build-ovati **iOS IPA** (opciono) - *ako su iOS secrets konfigurisani*

### 📦 Build Artifakti

Posle svakog build-a, možeš download-ovati:
- **Android Debug APK** - za instant testiranje na telefonu
- **Android Release AAB** - za upload na Google Play Store
- **iOS IPA** - za TestFlight ili App Store (opciono)

---

## 🎯 Kako Koristiti (3 Koraka)

### **Korak 1: Push Kod na GitHub**

```bash
git add .
git commit -m "Moja promena"
git push origin main
```

GitHub Actions će **AUTOMATSKI** startovati build! 🚀

---

### **Korak 2: Čekaj Build (5-10 minuta)**

1. Idi na https://github.com/PunisaRaicevic/HGBRTehnickaSluzba
2. Klikni na **"Actions"** tab
3. Vidi progress build-a u realnom vremenu

---

### **Korak 3: Download APK/AAB**

1. Kada build završi, klikni na njega
2. Scroll dole do **"Artifacts"** sekcije
3. Download:
   - `app-debug-XXXXXX` - APK za testiranje
   - `app-release-XXXXXX` - AAB za Google Play (ako je signing konfigurisan)

---

## 🔐 Android Signing (Za Google Play Release)

Da bi kreirao **release verziju** za Google Play, moraš konfigurisati signing:

### 📖 Detaljna Uputstva:
👉 **Pogledaj:** [SETUP_ANDROID_SIGNING.md](SETUP_ANDROID_SIGNING.md)

### 🏃‍♂️ Brzi Pregled:

1. **Generiši keystore** (jednokratno):
   ```bash
   keytool -genkey -v -keystore my-release-key.keystore \
     -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Konvertuj u Base64**:
   ```bash
   base64 -i my-release-key.keystore | pbcopy
   ```

3. **Dodaj Secrets na GitHub**:
   - Idi na: **Settings → Secrets and variables → Actions**
   - Dodaj 4 secrets (pogledaj [SETUP_ANDROID_SIGNING.md](SETUP_ANDROID_SIGNING.md))

4. **Push kod** - Release AAB će automatski biti build-ovan!

---

## 🍎 iOS Build (Opciono)

iOS buildovi su **OPCIONALNI** i zahtevaju:
- 💰 **Apple Developer Account** ($99/godišnje)
- 💻 **Mac računar** (za lokalni signing) ili koristi GitHub Actions macOS runner (besplatno!)

### 📖 Detaljna Uputstva:
👉 **Pogledaj:** [SETUP_IOS_SIGNING.md](SETUP_IOS_SIGNING.md)

**Napomena:** Za većinu hotel aplikacija, **Android verzija je dovoljna**! 📱

---

## 📲 Instalacija APK-a na Telefon

### Metod 1: Direct Transfer
1. Download `app-debug.apk` sa GitHub Actions
2. Prebaci na telefon (email, USB, Google Drive)
3. Omogući "Install from unknown sources" u Settings
4. Instaliraj APK

### Metod 2: QR Kod
1. Upload APK na cloud (Google Drive, Dropbox)
2. Kreiraj share link
3. Generiši QR kod: https://www.qr-code-generator.com/
4. Skenuj i instaliraj

---

## 🏪 Google Play Store Deploy

### Preduslov:
- **Google Play Developer Account** - $25 jednokratno
- Registracija: https://play.google.com/console/signup

### Upload Proces:

1. **Konfiguriši Android signing** (pogledaj gore)
2. **Push kod** - GitHub Actions će kreirati `app-release.aab`
3. **Download AAB** sa GitHub Actions
4. **Upload na Play Console**:
   - Kreiraj novu aplikaciju
   - Production → Create new release
   - Upload `app-release.aab`
   - Submit for review
5. **Sačekaj odobrenje** (1-7 dana)

---

## 🔄 Automatski Release sa Git Tags

Želiš da release-uješ verziju 1.0.0?

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions će **automatski kreirati GitHub Release** sa APK i AAB priloženim! 🎉

---

## 💰 Troškovi

| Šta | Koliko |
|-----|--------|
| **GitHub Actions** | ✅ **BESPLATNO** (2000 min/mesec za privatne repo) |
| **Android Build** | ✅ **BESPLATNO** |
| **iOS Build** | ✅ **BESPLATNO** (3000 min macOS runner) |
| **Google Play Account** | 💵 $25 jednokratno |
| **Apple Developer Account** | 💵 $99/godišnje (opciono) |

**Jedan build traje ~5-10 minuta = 200-400 buildova mesečno potpuno BESPLATNO!** 🚀

---

## 🎛️ Build Trigger-i

Build-ovi se automatski pokreću kada:

✅ **Push na `main` branch**
```bash
git push origin main
```

✅ **Push na `develop` branch**
```bash
git push origin develop
```

✅ **Kreiranje Git Tag-a**
```bash
git tag v1.0.0
git push origin v1.0.0
```

✅ **Ručno pokretanje** (Manual trigger)
- Idi na **Actions** tab → Izaberi workflow → "Run workflow"

---

## 📊 Build Status Badge

Dodaj ovo u tvoj `README.md` da prikaže build status:

```markdown
![Android Build](https://github.com/PunisaRaicevic/HGBRTehnickaSluzba/workflows/Build%20Android%20APK%2FAAB/badge.svg)
```

Rezultat: ![Android Build](https://github.com/PunisaRaicevic/HGBRTehnickaSluzba/workflows/Build%20Android%20APK%2FAAB/badge.svg)

---

## 🆘 Troubleshooting

### ❌ Build Failed: "Permission denied: gradlew"

**Fix:**
```bash
chmod +x android/gradlew
git add android/gradlew
git commit -m "Fix gradlew permissions"
git push
```

### ❌ Build Failed: "npm run build failed"

Proveri da li build radi lokalno:
```bash
npm run build
```

### ❌ No Artifacts Available

- Proveri da li je build **uspešno završen** (zelena check mark)
- Artifacts se brišu posle 30-90 dana

### ❌ "Build timeout exceeded"

- Besplatni plan ima limit od 6 sati po job-u
- Tvoji buildovi traju ~5-10 minuta, nema problema

---

## 🎓 Dodatni Resursi

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Capacitor Docs:** https://capacitorjs.com/docs
- **Android Publishing:** https://developer.android.com/studio/publish
- **iOS Publishing:** https://developer.apple.com/app-store/submissions/

---

## 💡 Pro Tips

✨ **Koristi Draft Releases** za beta verzije pre produkcije
✨ **Setup branch protection** da sprečiš slučajne production deploy-e
✨ **Generiraj release notes** automatski sa commit messages
✨ **Koristi semantic versioning** (v1.2.3) za release tags

---

## 🎉 Gotovo!

Sad imaš **potpuno automatizovan, besplatan CI/CD sistem** za mobilnu aplikaciju! 

Svaki push na GitHub automatski pravi novu verziju aplikacije spremnu za testiranje ili deploy! 🚀📱

**Pitanja?** Pogledaj detaljne uputstva:
- 📱 [Android Signing Setup](SETUP_ANDROID_SIGNING.md)
- 🍎 [iOS Signing Setup](SETUP_IOS_SIGNING.md)
